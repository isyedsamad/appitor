"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  Settings,
  Shield,
  MessageSquare,
  Save,
  Power,
} from "lucide-react";
import { fetchSystemSettings } from "@/lib/admin/settingsService";
import { DEFAULT_SYSTEM_SETTINGS } from "@/lib/admin/defaultSystemSettings";
import secureAxios from "@/lib/secureAxios";

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
        const data = await fetchSystemSettings();
        setSettings({
            ...DEFAULT_SYSTEM_SETTINGS,
            ...data,
            auth: {
                ...DEFAULT_SYSTEM_SETTINGS.auth,
                ...(data?.auth || {}),
            },
            communication: {
                ...DEFAULT_SYSTEM_SETTINGS.communication,
                ...(data?.communication || {}),
            },
        })
    }
    load();
  }, []);

  if (!settings) {
    return <div className="text-muted">Loading settings…</div>;
  }

  async function save() {
    setSaving(true);
    await secureAxios.post("/api/admin/settings/update", settings);
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Settings size={20} />
          System Settings
        </h1>
        <p className="text-sm text-muted">
          Global configuration for Appitor Admin
        </p>
      </div>

      <Section icon={Settings} title="General">
        <Input
          label="Application Name"
          value={settings.appName}
          onChange={(e) =>
            setSettings({ ...settings, appName: e.target.value })
          }
        />

        <Input
          label="Support Email"
          value={settings.supportEmail}
          onChange={(e) =>
            setSettings({ ...settings, supportEmail: e.target.value })
          }
        />
      </Section>

      <Section icon={Shield} title="Authentication & Security">
        <Toggle
          label="Force password change on first login"
          value={settings.auth.forcePasswordReset}
          onChange={(v) =>
            setSettings({
              ...settings,
              auth: { ...settings.auth, forcePasswordReset: v },
            })
          }
        />

        <Toggle
          label="Allow username-based login"
          value={settings.auth.usernameLogin}
          onChange={(v) =>
            setSettings({
              ...settings,
              auth: { ...settings.auth, usernameLogin: v },
            })
          }
        />
      </Section>

      <Section icon={MessageSquare} title="Communication">
        <Toggle
          label="Enable Email Notifications"
          value={settings.communication.emailEnabled}
          onChange={(v) =>
            setSettings({
              ...settings,
              communication: {
                ...settings.communication,
                emailEnabled: v,
              },
            })
          }
        />

        <Toggle
          label="Enable SMS Notifications"
          value={settings.communication.smsEnabled}
          onChange={(v) =>
            setSettings({
              ...settings,
              communication: {
                ...settings.communication,
                smsEnabled: v,
              },
            })
          }
        />
      </Section>

      <Section icon={Power} title="System Controls">
        <Toggle
          label="Maintenance Mode"
          value={settings.maintenanceMode}
          onChange={(v) =>
            setSettings({ ...settings, maintenanceMode: v })
          }
        />
        <p className="text-xs text-muted">
          When enabled, all schools will be temporarily blocked from accessing Appitor.
        </p>
      </Section>

      <div className="flex justify-end">
        <button
          className="btn-primary"
          onClick={save}
          disabled={saving}
        >
          <Save size={16} />
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}


function Section({ icon: Icon, title, children }) {
  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <Icon size={18} />
        <h2 className="font-medium">{title}</h2>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted">{label}</label>
      <input {...props} />
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 p-3 border border-[var(--border)] rounded-md">
      <span className="text-sm">{label}</span>
      <input
        type="checkbox"
        className="w-4 h-3 mr-2 accent-[var(--primary)]"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
