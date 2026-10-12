import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Filter, Users, LayoutGrid, List } from "lucide-react";
import { useGetContractorsQuery } from "../../api/apiSlice";
import ContractorsTable from "./components/ContractorsTable";
import TableSkeleton from "../../components/TableSkeleton";

const Contractors = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  // Fetch all contractors
  const { data: contractors = [], isLoading: contractorsLoading } =
    useGetContractorsQuery();

  const handleViewWorkers = (contractor) => {
    navigate(`/contractors/${contractor.id}/workers`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50/50 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-sm ring-1 ring-primary/20">
            <Users size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Contractors
            </h1>
            <p className="text-sm text-gray-500 font-medium">
              Manage your agent and agency partners
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards Section (Optional, based on requirement) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Total Agents
            </p>
            <p className="text-xl font-bold text-gray-900">
              {contractors.length}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
            <Plus size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Active Partners
            </p>
            <p className="text-xl font-bold text-gray-900">
              {contractors.filter((c) => c.is_active).length}
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md group">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by name, ID, phone or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-100 rounded-xl text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary/30 focus:bg-white transition-all outline-none placeholder:text-gray-400 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Contractors Table Section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {contractorsLoading ? (
          <TableSkeleton columns={6} rows={5} />
        ) : (
          <ContractorsTable
            data={contractors}
            onViewWorkers={handleViewWorkers}
            searchTerm={searchTerm}
          />
        )}
      </div>
    </div>
  );
};

export default Contractors;
