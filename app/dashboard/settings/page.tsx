"use client"

import { useState } from "react";
import { Save, User, Shield, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const SettingsPage = () => {
  const [profile, setProfile] = useState({ name: "Admin User", email: "admin@uroedu.com" });
  const [notifications, setNotifications] = useState({ email: true, newUser: true, mockComplete: false });

  const handleSave = () => {
    toast.success("Settings saved successfully");
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Profile */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5 text-primary" /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-primary" /> Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Current Password</Label>
            <Input type="password" placeholder="••••••••" />
          </div>
          <div>
            <Label>New Password</Label>
            <Input type="password" placeholder="••••••••" />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-5 w-5 text-primary" /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Email Notifications</p>
              <p className="text-xs text-muted-foreground">Receive email updates</p>
            </div>
            <Switch checked={notifications.email} onCheckedChange={(v) => setNotifications({ ...notifications, email: v })} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">New User Alerts</p>
              <p className="text-xs text-muted-foreground">Get notified when a new user registers</p>
            </div>
            <Switch checked={notifications.newUser} onCheckedChange={(v) => setNotifications({ ...notifications, newUser: v })} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Mock Test Completions</p>
              <p className="text-xs text-muted-foreground">Alerts when mock tests are completed</p>
            </div>
            <Switch checked={notifications.mockComplete} onCheckedChange={(v) => setNotifications({ ...notifications, mockComplete: v })} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
        <Save className="mr-2 h-4 w-4" /> Save Settings
      </Button>
    </div>
  );
};

export default SettingsPage;
