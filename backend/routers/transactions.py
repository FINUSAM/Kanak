from typing import List, Optional
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, status
from database import database
from models import User, UserRole, Transaction, TransactionCreate, TransactionSplitCreate, SplitMode, TransactionUpdate
from models import transactions, members, transaction_splits
from security import get_current_user

router = APIRouter(tags=["transactions"])

async def authorize_transaction_creation(groupId: str, current_user: User):
    member_query = members.select().where(
        (members.c.groupId == groupId) & (members.c.userId == current_user.id)
    )
    member = await database.fetch_one(member_query)
    if not member:
        raise HTTPException(status_code=403, detail="Not authorized for this group.")
    
    if member["role"] not in [UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR, UserRole.CONTRIBUTOR]:
        raise HTTPException(status_code=403, detail="Your role does not permit creating transactions.")

async def authorize_transaction_modification(groupId: str, current_user: User):
    member_query = members.select().where(
        (members.c.groupId == groupId) & (members.c.userId == current_user.id)
    )
    member = await database.fetch_one(member_query)
    if not member:
        raise HTTPException(status_code=403, detail="Not authorized for this group.")
    
    if member["role"] not in [UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR]:
        raise HTTPException(status_code=403, detail="Your role does not permit modifying transactions.")

@router.get("/{groupId}/transactions", response_model=List[Transaction])
async def get_transactions_for_group(groupId: str, current_user: User = Depends(get_current_user)):
    # Check if user is a member of the group
    member_query = members.select().where(
        (members.c.groupId == groupId) & (members.c.userId == current_user.id)
    )
    if not await database.fetch_one(member_query):
        raise HTTPException(status_code=403, detail="Not authorized to view transactions for this group")

    query = transactions.select().where(transactions.c.groupId == groupId)
    transaction_records = await database.fetch_all(query)

    # Fetch splits for each transaction
    transactions_with_splits = []
    for trans_rec in transaction_records:
        splits_query = transaction_splits.select().where(transaction_splits.c.transactionId == trans_rec["id"])
        splits = await database.fetch_all(splits_query)
        transactions_with_splits.append({**trans_rec, "splits": splits})
    
    return transactions_with_splits

@router.get("/{groupId}/transactions/{transactionId}", response_model=Transaction)
async def get_transaction_by_id(groupId: str, transactionId: str, current_user: User = Depends(get_current_user)):
    # Check if user is a member of the group
    member_query = members.select().where(
        (members.c.groupId == groupId) & (members.c.userId == current_user.id)
    )
    if not await database.fetch_one(member_query):
        raise HTTPException(status_code=403, detail="Not authorized to view transactions for this group")

    transaction_query = transactions.select().where(
        (transactions.c.id == transactionId) & (transactions.c.groupId == groupId)
    )
    transaction_record = await database.fetch_one(transaction_query)

    if not transaction_record:
        raise HTTPException(status_code=404, detail="TransactionNotFound")

    splits_query = transaction_splits.select().where(transaction_splits.c.transactionId == transactionId)
    splits = await database.fetch_all(splits_query)
    
    return {**transaction_record, "splits": splits}

def validate_splits(transaction_data: TransactionCreate):
    total_amount = transaction_data.amount
    split_mode = transaction_data.splitMode
    splits = transaction_data.splits

    if not splits:
        raise HTTPException(status_code=400, detail="Transaction must have at least one split.")

    if split_mode == SplitMode.PERCENTAGE:
        total_percentage = sum(s.percentage for s in splits if s.percentage is not None)
        if abs(total_percentage - 100.0) > 0.01:
            raise HTTPException(status_code=400, detail="Sum of percentages must be 100%.")
    elif split_mode == SplitMode.AMOUNT:
        total_split_amount = sum(s.amount for s in splits)
        if abs(total_split_amount - total_amount) > 0.01:
            raise HTTPException(status_code=400, detail="Sum of split amounts must equal total amount.")

@router.post("/{groupId}/transactions", response_model=Transaction, status_code=status.HTTP_201_CREATED)
async def add_transaction(groupId: str, transaction_data: TransactionCreate, current_user: User = Depends(get_current_user)):
    await authorize_transaction_creation(groupId, current_user)
    validate_splits(transaction_data) # Validate splits
    
    # Insert transaction
    transaction_id = str(uuid4())
    transaction_query = transactions.insert().values(
        id=transaction_id,
        groupId=groupId,
        type=transaction_data.type,
        amount=transaction_data.amount,
        description=transaction_data.description,
        createdBy=current_user.username,
        createdById=current_user.id,
        payerId=transaction_data.payerId,
        splitMode=transaction_data.splitMode
    )
    await database.execute(transaction_query)

    # Insert splits
    split_values = []
    for split in transaction_data.splits:
        split_values.append({
            "transactionId": transaction_id,
            "userId": split.userId,
            "amount": split.amount,
            "percentage": split.percentage
        })
    if split_values:
        await database.execute_many(transaction_splits.insert(), split_values)

    # Fetch the newly created transaction with its splits
    new_transaction_query = transactions.select().where(transactions.c.id == transaction_id)
    new_transaction_record = await database.fetch_one(new_transaction_query)
    
    new_splits_query = transaction_splits.select().where(transaction_splits.c.transactionId == transaction_id)
    new_splits = await database.fetch_all(new_splits_query)

    return {**new_transaction_record, "splits": new_splits}

@router.put("/{groupId}/transactions/{transactionId}", response_model=Transaction)
async def update_transaction(groupId: str, transactionId: str, transaction_data: TransactionUpdate, current_user: User = Depends(get_current_user)):
    await authorize_transaction_modification(groupId, current_user)
    
    # Check if transaction exists and belongs to the group
    existing_transaction_query = transactions.select().where(
        (transactions.c.id == transactionId) & (transactions.c.groupId == groupId)
    )
    if not await database.fetch_one(existing_transaction_query):
        raise HTTPException(status_code=404, detail="TransactionNotFound")

    validate_splits(transaction_data) # Validate splits
    
    # Prepare update values
    update_values = {
        "type": transaction_data.type,
        "amount": transaction_data.amount,
        "description": transaction_data.description,
        "payerId": transaction_data.payerId,
        "splitMode": transaction_data.splitMode,
    }
    if transaction_data.date:
        update_values["date"] = transaction_data.date

    # Update transaction
    update_transaction_query = transactions.update().where(transactions.c.id == transactionId).values(**update_values)
    await database.execute(update_transaction_query)

    # Delete existing splits and insert new ones
    delete_splits_query = transaction_splits.delete().where(transaction_splits.c.transactionId == transactionId)
    await database.execute(delete_splits_query)

    split_values = []
    for split in transaction_data.splits:
        split_values.append({
            "transactionId": transactionId,
            "userId": split.userId,
            "amount": split.amount,
            "percentage": split.percentage
        })
    if split_values:
        await database.execute_many(transaction_splits.insert(), split_values)

    # Fetch the updated transaction with its splits
    updated_transaction_query = transactions.select().where(transactions.c.id == transactionId)
    updated_transaction_record = await database.fetch_one(updated_transaction_query)
    
    updated_splits_query = transaction_splits.select().where(transaction_splits.c.transactionId == transactionId)
    updated_splits = await database.fetch_all(updated_splits_query)

    return {**updated_transaction_record, "splits": updated_splits}

@router.delete("/{groupId}/transactions/{transactionId}", status_code=status.HTTP_200_OK)
async def delete_transaction(groupId: str, transactionId: str, current_user: User = Depends(get_current_user)):
    await authorize_transaction_modification(groupId, current_user)

    # Check if transaction exists and belongs to the group
    existing_transaction_query = transactions.select().where(
        (transactions.c.id == transactionId) & (transactions.c.groupId == groupId)
    )
    if not await database.fetch_one(existing_transaction_query):
        raise HTTPException(status_code=404, detail="TransactionNotFound")
    
    # Delete splits first
    delete_splits_query = transaction_splits.delete().where(transaction_splits.c.transactionId == transactionId)
    await database.execute(delete_splits_query)

    # Delete transaction
    delete_transaction_query = transactions.delete().where(transactions.c.id == transactionId)
    await database.execute(delete_transaction_query)

    return {"message": "Transaction deleted successfully"}
