'use client'

import { useState, useEffect } from 'react'
import { X, User, Trash2, Edit2, ShieldAlert, KeyRound, Plus, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface UserRecord {
  id: string
  name: string
  email: string
  role: string
  created_at: string
}

export function UserManagementModal({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
}: {
  isOpen: boolean
  onClose: () => void
  currentUser: { id: string; name: string; email: string; role: string } | null
  onUserUpdated: () => void
}) {
  const [activeTab, setActiveTab] = useState<'profile' | 'directory'>('profile')
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Profile Edit fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [submittingProfile, setSubmittingProfile] = useState(false)

  // User Administration Form (Create / Edit)
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null)
  const [showAdminForm, setShowAdminForm] = useState(false)
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminRole, setAdminRole] = useState('user')
  const [adminError, setAdminError] = useState<string | null>(null)
  const [adminSubmitting, setAdminSubmitting] = useState(false)

  // Populate profile fields
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name)
      setEmail(currentUser.email)
    }
  }, [currentUser, isOpen])

  // Fetch all users when opening Directory tab
  useEffect(() => {
    if (isOpen && activeTab === 'directory') {
      fetchUsers()
    }
  }, [activeTab, isOpen])

  async function fetchUsers() {
    setLoadingUsers(true)
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      setLoadingUsers(false)
    }
  }

  if (!isOpen) return null

  // Handle Profile Update
  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUser) return

    setSubmittingProfile(true)
    setProfileMessage(null)
    setProfileError(null)

    try {
      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password: password || undefined }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update profile.')

      setProfileMessage('Profile updated successfully!')
      setPassword('')
      onUserUpdated()
    } catch (err: any) {
      setProfileError(err.message || 'An error occurred.')
    } finally {
      setSubmittingProfile(false)
    }
  }

  // Handle User Deletion
  async function handleDeleteUser(userId: string) {
    if (!confirm('Are you sure you want to delete this user? All their files and messages will be permanently removed.')) {
      return
    }

    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId))
        if (currentUser?.id === userId) {
          // Log out if deleting own account
          window.location.href = '/login'
        }
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete user.')
      }
    } catch (err) {
      console.error(err)
      alert('Failed to connect to server.')
    }
  }

  // Handle Admin CRUD actions (Create / Edit existing user)
  async function handleAdminSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAdminSubmitting(true)
    setAdminError(null)

    try {
      const method = selectedUser ? 'PUT' : 'POST'
      const endpoint = selectedUser ? `/api/users/${selectedUser.id}` : '/api/users'
      
      const payload = {
        name: adminName,
        email: adminEmail,
        role: adminRole,
        password: adminPassword || undefined,
      }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit.')

      setShowAdminForm(false)
      setSelectedUser(null)
      fetchUsers()
      if (selectedUser?.id === currentUser?.id) {
        onUserUpdated()
      }
    } catch (err: any) {
      setAdminError(err.message || 'An error occurred.')
    } finally {
      setAdminSubmitting(false)
    }
  }

  function startCreateUser() {
    setSelectedUser(null)
    setAdminName('')
    setAdminEmail('')
    setAdminPassword('')
    setAdminRole('user')
    setAdminError(null)
    setShowAdminForm(true)
  }

  function startEditUser(user: UserRecord) {
    setSelectedUser(user)
    setAdminName(user.name)
    setAdminEmail(user.email)
    setAdminPassword('')
    setAdminRole(user.role)
    setAdminError(null)
    setShowAdminForm(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-background shadow-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <User className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Account & User Settings</h2>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close settings">
            <X />
          </Button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-border bg-secondary/30">
          <button
            onClick={() => { setActiveTab('profile'); setShowAdminForm(false); }}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'profile'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            My Profile
          </button>
          <button
            onClick={() => { setActiveTab('directory'); setShowAdminForm(false); }}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'directory'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            User Directory (CRUD)
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
              <div className="flex flex-col gap-2">
                <Label htmlFor="prof-name">Name</Label>
                <Input
                  id="prof-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Lovelace"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="prof-email">Email</Label>
                <Input
                  id="prof-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ada@company.com"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="prof-password">Change Password</Label>
                  <span className="text-xs text-muted-foreground">Optional</span>
                </div>
                <Input
                  id="prof-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8+ characters to update"
                />
              </div>

              {profileMessage && (
                <p className="text-sm text-green-500 font-medium" role="status">
                  {profileMessage}
                </p>
              )}

              {profileError && (
                <p className="text-sm text-destructive" role="alert">
                  {profileError}
                </p>
              )}

              <Button type="submit" disabled={submittingProfile} className="mt-2">
                {submittingProfile ? (
                  <>
                    <LoaderCircle className="animate-spin size-4" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </form>
          )}

          {activeTab === 'directory' && (
            <div className="space-y-4">
              {!showAdminForm ? (
                <>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      List and manage system users. Accounts here can perform RAG operations.
                    </p>
                    <Button onClick={startCreateUser} size="sm">
                      <Plus className="size-4" /> Add User
                    </Button>
                  </div>

                  {loadingUsers ? (
                    <div className="py-12 flex justify-center items-center text-sm text-muted-foreground gap-2">
                      <LoaderCircle className="animate-spin size-5" />
                      Loading directory database...
                    </div>
                  ) : (
                    <div className="border border-border rounded-lg overflow-hidden">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="bg-secondary/40 border-b border-border">
                            <th className="px-4 py-3 font-semibold text-muted-foreground">Name</th>
                            <th className="px-4 py-3 font-semibold text-muted-foreground">Email</th>
                            <th className="px-4 py-3 font-semibold text-muted-foreground">Role</th>
                            <th className="px-4 py-3 font-semibold text-muted-foreground text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {users.map((u) => (
                            <tr key={u.id} className="hover:bg-accent/40 transition-colors">
                              <td className="px-4 py-3 font-medium flex items-center gap-2">
                                <span className="size-6 shrink-0 rounded-full bg-secondary font-mono text-[0.65rem] font-bold text-secondary-foreground flex items-center justify-center">
                                  {u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </span>
                                <span className="truncate max-w-[120px]">{u.name} {currentUser?.id === u.id && '(You)'}</span>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground truncate max-w-[150px]">{u.email}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider ${
                                  u.role === 'admin' 
                                    ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                                    : 'bg-primary/10 text-primary border border-primary/20'
                                }`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    onClick={() => startEditUser(u)}
                                    title="Edit details"
                                  >
                                    <Edit2 className="size-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    onClick={() => handleDeleteUser(u.id)}
                                    title="Delete user"
                                    className="text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                <form onSubmit={handleAdminSubmit} className="space-y-4 max-w-md border border-border rounded-xl p-5 bg-secondary/10">
                  <div className="flex justify-between items-center border-b border-border pb-3 mb-2">
                    <h3 className="font-semibold text-sm">
                      {selectedUser ? `Edit ${selectedUser.name}` : 'Create New Account'}
                    </h3>
                    <Button type="button" variant="ghost" size="icon-xs" onClick={() => setShowAdminForm(false)}>
                      <X className="size-4" />
                    </Button>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="adm-name">Full Name</Label>
                    <Input
                      id="adm-name"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="Ada Lovelace"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="adm-email">Email Address</Label>
                    <Input
                      id="adm-email"
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="ada@company.com"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="adm-role">Account Role</Label>
                    <select
                      id="adm-role"
                      value={adminRole}
                      onChange={(e) => setAdminRole(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="adm-password">Password</Label>
                      {selectedUser && <span className="text-xs text-muted-foreground">Leave blank to keep same</span>}
                    </div>
                    <Input
                      id="adm-password"
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder={selectedUser ? 'Unchanged' : '8+ characters'}
                      required={!selectedUser}
                    />
                  </div>

                  {adminError && (
                    <p className="text-sm text-destructive" role="alert">
                      {adminError}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowAdminForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={adminSubmitting}>
                      {adminSubmitting ? <LoaderCircle className="animate-spin size-4" /> : 'Save User'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
