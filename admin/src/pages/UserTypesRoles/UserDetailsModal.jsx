import React from "react";
import Modal from "../../components/Modal";
import { getImageUrl } from "../../utils/imageUrl";
import {
  Mail,
  Phone,
  User as UserIcon,
  Shield,
  Image as ImageIcon,
  Coins,
} from "lucide-react";

const UserDetailsModal = ({ isOpen, onClose, user, isLoading }) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="User Details" size="xl">
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500 font-medium">
            Loading user profile...
          </p>
        </div>
      ) : user ? (
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          {/* Header Info */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl shadow-sm border-2 border-white">
              {(user.name || "").charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{user.name}</h3>
              <p className="text-sm text-gray-500 font-medium flex items-center gap-1">
                <Shield size={14} /> {user.public_id || "N/A"}
              </p>
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {user.firm && (
              <div className="space-y-1 col-span-2 md:col-span-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Firm Name
                </label>
                <div className="flex items-center gap-2 text-primary font-bold p-2.5 bg-blue-50/50 border border-blue-100 rounded-lg uppercase tracking-tight">
                  <UserIcon size={16} />
                  <span>{user.firm}</span>
                </div>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Email Address
              </label>
              <div className="flex items-center gap-2 text-gray-700 font-medium p-2.5 bg-white border border-gray-200 rounded-lg">
                <Mail size={16} className="text-primary" />
                <span className="truncate">{user.email}</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Phone Number
              </label>
              <div className="flex items-center gap-2 text-gray-700 font-medium p-2.5 bg-white border border-gray-200 rounded-lg">
                <Phone size={16} className="text-primary" />
                <span>{user.phone || "N/A"}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Status
              </label>
              <div className="p-2.5 bg-white border border-gray-200 rounded-lg">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                    user.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {user.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>

          {/* Images Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ImageIcon size={18} className="text-primary" />
              User Documents/Images
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {user.images && user.images.length > 0 ? (
                user.images.map((img, idx) => (
                  <div
                    key={idx}
                    className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-primary transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                      <img
                        src={getImageUrl(
                          img.url || (img.path ? `/storage/${img.path}` : null),
                        )}
                        alt={img.type}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src =
                            "https://via.placeholder.com/400x300?text=Image+Not+Found";
                        }}
                      />
                    </div>
                    <div className="p-3 bg-white border-t border-gray-100">
                      <p className="text-xs font-bold text-gray-900 uppercase tracking-tight truncate">
                        Type: <span className="text-primary">{img.type}</span>
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-8 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center bg-gray-50">
                  <ImageIcon size={32} className="text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400 font-medium">
                    No documents uploaded
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-gray-500">
          User profile not found.
        </div>
      )}
    </Modal>
  );
};

export default UserDetailsModal;
