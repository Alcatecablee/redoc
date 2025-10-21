import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function TeamManagement() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const { toast } = useToast();

  const fetchOrgs = async () => {
    try {
      const res = await fetch('/api/organizations', { headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setOrgs(data.organizations || []);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message || 'Failed to load organizations', variant: 'destructive' });
    }
  };

  useEffect(() => { fetchOrgs(); }, []);

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/organizations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, slug }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      setName(''); setSlug('');
      toast({ title: 'Organization created' });
      fetchOrgs();
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message || 'Failed to create org', variant: 'destructive' });
    }
  };

  const selectOrg = async (org: any) => {
    setSelectedOrg(org);
    try {
      const res = await fetch(`/api/organizations/${org.id}/members`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load members');
      setMembers(data.members || []);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message || 'Failed to load members', variant: 'destructive' });
    }
  };

  const handleInvite = async () => {
    if (!selectedOrg) return; if (!inviteEmail) return toast({ title: 'Email required' });
    try {
      const res = await fetch(`/api/organizations/${selectedOrg.id}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: inviteEmail }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to invite');
      setInviteEmail('');
      toast({ title: 'Member added' });
      selectOrg(selectedOrg);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message || 'Failed to invite', variant: 'destructive' });
    }
  };

  const changeRole = async (memberId: number, role: string) => {
    try {
      const res = await fetch(`/api/organizations/${selectedOrg.id}/members/${memberId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      toast({ title: 'Role updated' });
      selectOrg(selectedOrg);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message || 'Failed to update role', variant: 'destructive' });
    }
  };

  const removeMember = async (memberId: number) => {
    try {
      const res = await fetch(`/api/organizations/${selectedOrg.id}/members/${memberId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove');
      toast({ title: 'Member removed' });
      selectOrg(selectedOrg);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message || 'Failed to remove member', variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <Card className="p-4">
            <h3 className="text-lg font-bold">Your Organizations</h3>
            <div className="mt-3 space-y-2">
              {orgs.map(o => (
                <div key={o.id} className="flex items-center justify-between">
                  <button className="text-left text-sm text-gray-800" onClick={() => selectOrg(o)}>{o.name}</button>
                  <span className="text-xs text-gray-500">{o.slug}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-lg font-bold">Create Organization</h3>
            <div className="mt-3 space-y-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Organization name" />
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug (example: my-team)" />
              <Button onClick={handleCreate} className="w-full">Create</Button>
            </div>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-4">
          {selectedOrg ? (
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{selectedOrg.name} — Members</h3>
                <span className="text-sm text-gray-500">{selectedOrg.slug}</span>
              </div>

              <div className="mt-4">
                <div className="flex gap-2">
                  <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="invite by email" />
                  <Button onClick={handleInvite}>Invite</Button>
                </div>

                <div className="mt-4 space-y-2">
                  {members.length === 0 && <p className="text-sm text-gray-500">No members</p>}
                  {members.map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{m.user?.email || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">Role: {m.role}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select value={m.role} onChange={(e) => changeRole(m.id, e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm">
                          <option value="owner">owner</option>
                          <option value="admin">admin</option>
                          <option value="member">member</option>
                          <option value="viewer">viewer</option>
                        </select>
                        <Button variant="ghost" onClick={() => removeMember(m.id)}>Remove</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <p className="text-sm text-gray-500">Select an organization to manage members and roles.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
