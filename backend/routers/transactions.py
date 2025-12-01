from fastapi import APIRouter, HTTPException, status
from models import Transaction, TransactionCreate
from typing import List
from uuid import UUID

router = APIRouter()

# In-memory storage
transactions_db = {}


@router.get("/", response_model=List[Transaction])
def get_transactions_for_group(groupId: UUID):
    group_transactions = [
        trans for trans in transactions_db.values() if trans["groupId"] == groupId
    ]
    return group_transactions


@router.post("/", response_model=Transaction, status_code=status.HTTP_201_CREATED)
def add_transaction(groupId: UUID, transaction: TransactionCreate):
    new_transaction_id = UUID(int=len(transactions_db) + 1)
    new_transaction = Transaction(
        id=new_transaction_id,
        groupId=groupId,
        createdBy=UUID(int=1),  # Dummy user
        createdById=UUID(int=1),  # Dummy user
        **transaction.dict()
    )
    transactions_db[new_transaction_id] = new_transaction.dict()
    return new_transaction


@router.put("/{transactionId}", response_model=Transaction)
def update_transaction(groupId: UUID, transactionId: UUID, transaction: Transaction):
    if transactionId not in transactions_db:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # In a real app, you'd verify the groupId matches the transaction's groupId
    transactions_db[transactionId] = transaction.dict()
    return transaction


@router.delete("/{transactionId}")
def delete_transaction(groupId: UUID, transactionId: UUID):
    if transactionId not in transactions_db:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # In a real app, you'd verify the groupId matches the transaction's groupId
    del transactions_db[transactionId]
    return {"message": "Transaction deleted"}
