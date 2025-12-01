import React from 'react';
import { ArrowLeft, Copy, Check, FileJson } from 'lucide-react';
import { openApiSpec } from '../spec';

interface ApiDocsProps {
  onBack: () => void;
}

export const ApiDocs: React.FC<ApiDocsProps> = ({ onBack }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(openApiSpec, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                <FileJson size={20} />
            </div>
            <div>
                <h1 className="text-xl font-bold text-gray-900">Backend Specification</h1>
                <p className="text-xs text-gray-500">OpenAPI 3.0 Document</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            copied 
              ? 'bg-green-100 text-green-700' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
      </div>

      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="bg-gray-900 rounded-xl shadow-lg overflow-hidden border border-gray-800">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                <span className="text-xs font-mono text-gray-400">openapi.json</span>
                <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                </div>
            </div>
            <pre className="p-6 overflow-auto text-sm font-mono text-gray-300 leading-relaxed max-h-[80vh]">
                <code>
                    {JSON.stringify(openApiSpec, null, 2)}
                </code>
            </pre>
        </div>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border shadow-sm">
                <h3 className="font-bold text-gray-900 mb-2">Instructions for Backend Developer</h3>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-2">
                    <li>Implement the endpoints defined in the spec above.</li>
                    <li>Ensure <strong>JWT Authentication</strong> is used for secured routes.</li>
                    <li>Use a relational database (PostgreSQL/MySQL) to handle the <code>User</code>, <code>Group</code>, and <code>Transaction</code> relationships.</li>
                </ul>
            </div>
            <div className="bg-white p-6 rounded-xl border shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4">Key Enums</h3>
                <div className="space-y-6">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">User Roles</p>
                        <div className="flex flex-wrap gap-2">
                            {['OWNER', 'ADMIN', 'EDITOR', 'CONTRIBUTOR', 'VIEWER', 'GUEST'].map(r => (
                                <span key={r} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-mono border border-gray-200">{r}</span>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Transaction Types</p>
                        <div className="flex flex-wrap gap-2">
                            {['DEBIT', 'CREDIT'].map(r => (
                                <span key={r} className={`px-2 py-1 rounded text-xs font-mono border ${r === 'CREDIT' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{r}</span>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Split Modes</p>
                        <div className="flex flex-wrap gap-2">
                            {['EQUAL', 'PERCENTAGE', 'AMOUNT'].map(r => (
                                <span key={r} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-mono border border-indigo-200">{r}</span>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Invitation Status</p>
                        <div className="flex flex-wrap gap-2">
                            {['PENDING', 'ACCEPTED', 'REJECTED'].map(r => (
                                <span key={r} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-mono border border-gray-200">{r}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};