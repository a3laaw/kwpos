"use client"

import * as React from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { LoadingState } from "@/components/shared/loading-state"
import { EmptyState } from "@/components/shared/empty-state"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Users as UsersIcon,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Shield,
  ShoppingCart,
  Warehouse as WarehouseIcon,
} from "lucide-react"
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  type UserItem,
} from "@/hooks/use-api"
import { useT } from "@/components/i18n-context"
import { useUser } from "@/components/user-context"
import { cn } from "@/lib/utils"

const ROLE_META: Record<string, { icon: typeof Shield; color: string }> = {
  ADMIN: { icon: Shield, color: "bg-rose-500/15 text-rose-600 border-rose-300" },
  SALES: { icon: ShoppingCart, color: "bg-sky-500/15 text-sky-600 border-sky-300" },
  WAREHOUSE: { icon: WarehouseIcon, color: "bg-amber-500/15 text-amber-600 border-amber-300" },
}

export function UsersView() {
  const t = useT()
  const currentUser = useUser()
  const { data, isLoading, isError, refetch } = useUsers()
  const createMut = useCreateUser()
  const deleteMut = useDeleteUser()

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editUser, setEditUser] = React.useState<UserItem | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<UserItem | null>(null)

  const users = data?.items ?? []

  function handleCreate() {
    setEditUser(null)
    setDialogOpen(true)
  }

  function handleEdit(u: UserItem) {
    setEditUser(u)
    setDialogOpen(true)
  }

  async function handleDelete(u: UserItem) {
    if (!confirm(t.userDeleteConfirm?.replace("{name}", u.name) || `Delete "${u.name}"?`)) return
    try {
      await deleteMut.mutateAsync(u.id)
      toast.success(t.userDeleted || "User deleted")
    } catch (err: unknown) {
      toast.error(t.deleteFailed || "Delete failed", { description: (err as Error)?.message })
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.usersTitle || "إدارة المستخدمين"}
        description={t.usersDesc || "إدارة حسابات المستخدمين والأدوار والصلاحيات"}
        icon={<UsersIcon className="h-5 w-5" />}
        actions={
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            {t.newUser || "مستخدم جديد"}
          </Button>
        }
      />

      {isLoading ? (
        <LoadingState text={t.loading || "Loading..."} />
      ) : isError ? (
        <EmptyState title={t.loadFailed || "Load failed"} action={<Button onClick={() => refetch()}>{t.retry || "Retry"}</Button>} />
      ) : users.length === 0 ? (
        <EmptyState title={t.noUsers || "No users"} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="border-b border-border">
                    <th className="text-start py-3 px-4 font-semibold">{t.name || "Name"}</th>
                    <th className="text-start py-3 px-4 font-semibold hidden sm:table-cell">{t.email || "Email"}</th>
                    <th className="text-center py-3 px-4 font-semibold">{t.role || "Role"}</th>
                    <th className="text-center py-3 px-4 font-semibold hidden md:table-cell">{t.date || "Date"}</th>
                    <th className="text-center py-3 px-4 font-semibold">{t.actions || "Actions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const meta = ROLE_META[u.role] || ROLE_META.SALES
                    const RoleIcon = meta.icon
                    return (
                      <tr key={u.id} className="border-b border-border/40 hover:bg-muted/20">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                              {u.name.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium">{u.name}</span>
                            {u.id === currentUser.id ? (
                              <Badge variant="outline" className="text-[9px]">{t.you || "You"}</Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-mono text-xs hidden sm:table-cell" dir="ltr">
                          {u.email}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="outline" className={cn("gap-1", meta.color)}>
                            <RoleIcon className="h-3 w-3" />
                            {u.role === "ADMIN" ? (t.roleAdmin || "Admin") : u.role === "SALES" ? (t.roleSales || "Sales") : (t.roleWarehouse || "Warehouse")}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center text-xs text-muted-foreground hidden md:table-cell">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(u)} title={t.edit || "Edit"}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            {u.id !== currentUser.id ? (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(u)} title={t.delete || "Delete"}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={editUser}
      />
    </div>
  )
}

function UserDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserItem | null
}) {
  const t = useT()
  const isEdit = !!user
  const createMut = useCreateUser()
  const updateMut = useUpdateUser(user?.id ?? "")

  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [role, setRole] = React.useState("SALES")

  React.useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
      setPassword("")
      setRole(user.role)
    } else {
      setName("")
      setEmail("")
      setPassword("")
      setRole("SALES")
    }
  }, [user, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) {
      toast.error(t.productNameRequired || "Name and email required")
      return
    }
    if (!isEdit && !password.trim()) {
      toast.error(t.password || "Password required")
      return
    }

    try {
      if (isEdit) {
        const payload: Record<string, string> = { name: name.trim(), email: email.trim(), role }
        if (password.trim()) payload.password = password
        await updateMut.mutateAsync(payload)
        toast.success(t.productUpdated || "Updated")
      } else {
        await createMut.mutateAsync({ name: name.trim(), email: email.trim(), password, role })
        toast.success(t.productAdded || "Created")
      }
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = (err as Error)?.message || ""
      if (msg.includes("email-exists")) {
        toast.error(t.emailExists || "Email already exists")
      } else {
        toast.error(t.saveFailed || "Save failed", { description: msg })
      }
    }
  }

  const loading = createMut.isPending || updateMut.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? (t.editUser || "Edit User") : (t.newUser || "New User")}</DialogTitle>
          <DialogDescription>
            {isEdit ? (t.editUserDesc || "Update user details and role") : (t.newUserDesc || "Create a new user account")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="u-name">{t.name || "Name"} *</Label>
            <Input id="u-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder || "Full name"} autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-email">{t.email || "Email"} *</Label>
            <Input id="u-email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" className="text-left" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-pass">
              {t.password || "Password"} {isEdit ? `(${"optional"})` : " *"}
            </Label>
            <Input id="u-pass" type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isEdit ? "••••••" : "••••••••"} className="text-left" />
          </div>
          <div className="space-y-2">
            <Label>{t.role || "Role"}</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">{t.roleAdmin || "Administrator"}</SelectItem>
                <SelectItem value="SALES">{t.roleSales || "Sales Clerk"}</SelectItem>
                <SelectItem value="WAREHOUSE">{t.roleWarehouse || "Warehouse Keeper"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {t.cancel || "Cancel"}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEdit ? (t.save || "Save") : (t.add || "Add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
