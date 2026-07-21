"use client";

import { useState } from "react";
import { X, Lock, KeyRound, Eye, EyeOff, Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { toast } from "react-toastify";

export default function ChangePasswordModal({ open, onClose }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!open) return null;

  const handleClose = () => {
    if (loading) return;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrorMsg("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!currentPassword) {
      setErrorMsg("Please enter your current password.");
      return;
    }
    if (!newPassword) {
      setErrorMsg("Please enter a new password.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword === currentPassword) {
      setErrorMsg("New password must be different from current password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("New password and confirm password do not match.");
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error("No active session found. Please re-login.");
      }

      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      toast.success("Password updated successfully!", { theme: "colored" });
      handleClose();
    } catch (err) {
      console.error("Change Password Error:", err);
      let message = "Failed to update password. Please check your current password.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        message = "Current password is incorrect.";
      } else if (err.code === "auth/weak-password") {
        message = "The new password is too weak. Please use a stronger password.";
      } else if (err.code === "auth/requires-recent-login") {
        message = "Security timeout. Please log out and log back in to change your password.";
      } else if (err.message) {
        message = err.message;
      }
      setErrorMsg(message);
      toast.error(message, { theme: "colored" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 px-4 flex items-center justify-center animate-fade-in">
      <div className="w-full max-w-md bg-(--bg-card) rounded-2xl border border-(--border) shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-(--bg) border-b border-(--border)">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
              <KeyRound size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-base text-(--text)">Change Password</h2>
              <p className="text-xs text-(--text-muted)">Update your account password</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-(--primary-soft) text-(--text-muted) hover:text-(--text) transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Current Password */}
          <div>
            <label className="block text-xs font-medium text-(--text-muted) mb-1.5">
              Current Password
            </label>
            <div className="relative flex items-center">
              <input
                type={showCurrent ? "text" : "password"}
                className="input w-full pr-10"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 text-(--text-muted) hover:text-(--text) transition"
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-medium text-(--text-muted) mb-1.5">
              New Password
            </label>
            <div className="relative flex items-center">
              <input
                type={showNew ? "text" : "password"}
                className="input w-full pr-10"
                placeholder="Enter new password (min. 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 text-(--text-muted) hover:text-(--text) transition"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-medium text-(--text-muted) mb-1.5">
              Confirm New Password
            </label>
            <div className="relative flex items-center">
              <input
                type={showConfirm ? "text" : "password"}
                className="input w-full pr-10"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 text-(--text-muted) hover:text-(--text) transition"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-(--border) flex items-center justify-end gap-2.5">
            <button
              type="button"
              className="btn-outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Lock size={16} />
                  Update Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
