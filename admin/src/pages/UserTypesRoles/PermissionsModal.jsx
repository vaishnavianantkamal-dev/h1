import React from "react";
import { CheckCircle, Save } from "lucide-react";
import Modal from "../../components/Modal";

const PermissionsModal = ({
  isOpen,
  onClose,
  editingRole,
  permissions,
  currentPermissions,
  togglePermission,
  onSave,
  isLoading,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage Permissions: ${editingRole?.roleName}`}
      size="lg"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Select which sidebar items this role can access.
        </p>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto p-1">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="flex items-center p-3 rounded-lg border border-gray-100 bg-gray-50 animate-pulse"
              >
                <div className="w-5 h-5 rounded bg-gray-200 mr-3"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto p-1">
            {permissions.map((item) => (
              <div
                key={item.id}
                onClick={() => togglePermission(item.id)}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                  currentPermissions.includes(item.id)
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded border flex items-center justify-center mr-3 ${
                    currentPermissions.includes(item.id)
                      ? "bg-primary border-primary text-white"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {currentPermissions.includes(item.id) && (
                    <CheckCircle size={14} />
                  )}
                </div>
                <span
                  className={`text-sm font-medium ${
                    currentPermissions.includes(item.id)
                      ? "text-primary"
                      : "text-gray-700"
                  }`}
                >
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-50 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={isLoading}
            className={`flex items-center gap-2 px-4 py-2 text-white bg-primary rounded-lg hover:bg-blue-700 ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <Save size={16} /> Save Permissions
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PermissionsModal;
