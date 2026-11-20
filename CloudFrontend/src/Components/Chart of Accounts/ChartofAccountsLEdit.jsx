import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AppSelect from '../../Global/AppSelect.jsx'
import { getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions';
import ChartofAccountsTreeView from './ChartofAccountsView';

const ChartofAccountsEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const Accounts = useSelector((state) => state.ChartofAccounts.ChartofAccounts);

  const [stage1, setStage1] = useState('');
  const [stage2, setStage2] = useState('');
  const [stage3, setStage3] = useState('');
  const [treeData, setTreeData] = useState([]);
  const [defaultValues, setDefaultValues] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm();

  const stage = Number(watch("Stage", 1));

  useEffect(() => {
    const tree = buildTree(Accounts);
    setTreeData(tree);
  }, [Accounts]);

  useEffect(() => {
    try {
      const res = Accounts.find((item) => item._id == id)
      setDefaultValues(res);
      reset(res);
      setStage1(res.Stage1)
      setStage2(res.Stage2)
      setStage3(res.Stage3)
      setIsActive(res.isActive !== false) // Default true if undefined
    } catch {
      toast.error("Failed to load account data");
    }
  }, [id]);

  const buildTree = (data) => {
    const map = {};
    const tree = [];

    data.forEach(item => {
      map[item._id] = { ...item, children: [] };
    });

    data.forEach(item => {
      const stage = parseInt(item.Stage);
      if (stage === 1) {
        tree.push(map[item._id]);
      } else {
        const parentId = item[`Stage${stage - 1}`];
        if (parentId && map[parentId]) {
          map[parentId].children.push(map[item._id]);
        }
      }
    });

    return tree;
  };

  const stage1Accounts = Accounts.filter((item) => item.AccountCode.length === 1).map((Ac) => ({ label: Ac.AccountName, value: Ac._id }));
  const stage2Accounts = Accounts.filter((item) => item.AccountCode.length === 3).map((Ac) => ({ label: Ac.AccountName, value: Ac._id }));
  const stage3Accounts = Accounts.filter((item) => item.AccountCode.length === 5).map((Ac) => ({ label: Ac.AccountName, value: Ac._id }));

  const TreeNode = ({ node }) => {
    const [expanded, setExpanded] = useState(false);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <li className="mb-2">
        <div className="flex items-center">
          {hasChildren && (
            <button onClick={() => setExpanded(!expanded)} className="mr-2 font-bold text-black">
              {expanded ? '−' : '+'}
            </button>
          )}
          <span className={`text-[18px] hover:underline cursor-pointer ${node.isActive === false ? 'text-red-500 line-through' : 'text-black'}`}>
            {node.AccountName} <span className="text-sm pd-text-muted">({node.AccountCode})</span>
            {node.isActive === false && <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">Inactive</span>}
          </span>
        </div>
        {expanded && hasChildren && (
          <ul className="ml-6 mt-1">
            {node.children.map(child => (
              <TreeNode key={child._id} node={child} />
            ))}
          </ul>
        )}
      </li>
    );
  };

  // ===============================
  // Handle Inactive/Active Toggle
  // ===============================
  const handleToggleStatus = async () => {
    const newStatus = !isActive;

    // If deactivating, check balance first
    if (newStatus === false) {
      setLoading(true);
      try {
        const balanceRes = await getDataFundtion(`/ChartofAccounts/checkBalance/${id}`);

        if (balanceRes.data && !balanceRes.data.canDeactivate) {
          toast.error(`Balance zero nahi hai (${balanceRes.data.balance}). Pehle balance zero karo.`);
          setLoading(false);
          return;
        }
      } catch (error) {
        toast.error("Balance check karne mein error aa gaya");
        setLoading(false);
        return;
      }
    }

    // Toggle status
    setLoading(true);
    try {
      await updateDataFunction(`/ChartofAccounts/toggleStatus/${id}`, { isActive: newStatus });
      setIsActive(newStatus);
      toast.success(newStatus ? "Account activated successfully" : "Account deactivated successfully");
    } catch (error) {
      toast.error("Status update karne mein error aa gaya");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      const res = await updateDataFunction(`/ChartofAccounts/updatChartofAccounts/${id}`, data);
      toast.success("Chart of Account updated successfully");
      navigate('/ChartofAccounts');
    } catch (err) {
      toast.error("Something went wrong while updating");
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-center pd-text-body mb-6">Chart of Accounts Edit</h1>
      <ToastContainer />

      {/* Status Badge */}
      <div className="flex justify-center mb-4">
        <span className={`px-4 py-2 rounded-full text-sm font-semibold ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pd-card p-6 mb-6" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="block pd-text-body font-semibold mb-2">Stage</label>
          <select disabled className="w-full pd-bg-readonly px-4 py-2 border rounded-lg" {...register("Stage")}>
            <option value="1">Stage 1</option>
            <option value="2">Stage 2</option>
            <option value="3">Stage 3</option>
            <option value="4">Stage 4</option>
          </select>
        </div>

        <div>
          <label className="block pd-text-body font-semibold mb-2">Account Code</label>
          <input type="text" {...register("AccountCode")} disabled className="w-full pd-bg-muted px-4 py-2 border rounded-lg" />
        </div>

        <div>
          <label className="block pd-text-body font-semibold mb-2">Account Name</label>
          <input type="text" {...register("AccountName")} className="w-full px-4 py-2 border rounded-lg" required />
        </div>

        {stage === 2 && (
          <div>
            <label className="block pd-text-body font-semibold mb-2">Stage 1</label>
            <AppSelect isDisabled={true} value={stage1Accounts.find(opt => opt.value === stage1)} />
          </div>
        )}
        {stage === 3 && (
          <div>
            <label className="block pd-text-body font-semibold mb-2">Stage 2</label>
            <AppSelect isDisabled={true} value={stage2Accounts.find(opt => opt.value === stage2)} />
          </div>
        )}
        {stage === 4 && (
          <div>
            <label className="block pd-text-body font-semibold mb-2">Stage 3</label>
            <AppSelect isDisabled={true} value={stage3Accounts.find(opt => opt.value === stage3)} />
          </div>
        )}

        <div className="col-span-5 flex justify-end gap-3">
          {/* Inactive Button - Only for Stage 4 */}
          {stage === 4 && (
            <button
              type="button"
              onClick={handleToggleStatus}
              disabled={loading}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                isActive
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-green-500 text-white hover:bg-green-600'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Processing...' : (isActive ? 'Deactivate Account' : 'Activate Account')}
            </button>
          )}

          <button type="submit" className="pd-btn-save">
            Update Chart of Accounts
          </button>
        </div>
      </form>

      {/* Balance Info - Only for Stage 4 */}
      {stage === 4 && (
        <BalanceInfo accountId={id} isActive={isActive} />
      )}

      <ChartofAccountsTreeView />
    </div>
  );
};

// ===============================
// Balance Info Component
// ===============================
const BalanceInfo = ({ accountId, isActive }) => {
  const [balanceData, setBalanceData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBalance();
  }, [accountId]);

  const fetchBalance = async () => {
    setLoading(true);
    try {
      const res = await getDataFundtion(`/ChartofAccounts/checkBalance/${accountId}`);
      setBalanceData(res.data);
    } catch (error) {
      console.error("Error fetching balance:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="pd-card p-4 text-center">Loading balance...</div>;
  if (!balanceData) return null;

  return (
    <div className="pd-card p-4 mb-6">
      <h3 className="text-lg font-semibold mb-3">Account Balance</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-500">Total Debit</div>
          <div className="text-lg font-bold">{Number(balanceData.totalDebit || 0).toLocaleString()}</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-500">Total Credit</div>
          <div className="text-lg font-bold">{Number(balanceData.totalCredit || 0).toLocaleString()}</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-500">Balance</div>
          <div className={`text-lg font-bold ${balanceData.balance === 0 ? 'text-green-600' : 'text-red-600'}`}>
            {Number(balanceData.balance || 0).toLocaleString()}
          </div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-500">Status</div>
          <div className={`text-lg font-bold ${balanceData.canDeactivate ? 'text-green-600' : 'text-red-600'}`}>
            {balanceData.canDeactivate ? 'Can Deactivate' : 'Cannot Deactivate'}
          </div>
        </div>
      </div>
      {!balanceData.canDeactivate && isActive && (
        <p className="text-red-500 text-sm mt-3">
          Balance zero nahi hai. Account deactivate karne ke liye pehle balance zero karo.
        </p>
      )}
    </div>
  );
};

export default ChartofAccountsEdit;
