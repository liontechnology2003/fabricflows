
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, MoreHorizontal, Edit, Trash2, Shield, Briefcase, ClipboardList, User as UserIcon, X, ChevronDown, ChevronUp } from "lucide-react";
import type { User, Team } from "@/lib/types";
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";


export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersRes, teamsRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/teams'),
        ]);
        const usersData = await usersRes.json();
        const teamsData = await teamsRes.json();
        setUsers(usersData);
        setTeams(teamsData);
      } catch (error) {
        console.error("Failed to fetch data", error);
        toast({
          variant: "destructive",
          title: "Failed to load data",
          description: "There was a problem fetching user and team data.",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);
  
  const filteredUsers = useMemo(() => {
    if (!searchQuery) {
        return users;
    }
    return users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [users, searchQuery]);


  // User Management State
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [isUserConfirmOpen, setIsUserConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Team Management State
  const [isTeamFormOpen, setIsTeamFormOpen] = useState(false);
  const [isTeamConfirmOpen, setIsTeamConfirmOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [currentTeam, setCurrentTeam] = useState<Partial<Team>>({ name: '', memberIds: [] });
  const [memberToRemove, setMemberToRemove] = useState<{team: Team, memberId: string} | null>(null);
  const [isRemoveMemberConfirmOpen, setIsRemoveMemberConfirmOpen] = useState(false);


  const roleIcons: Record<User['role'], React.ElementType> = {
    Admin: Shield,
    Manager: Briefcase,
    Supervisor: ClipboardList,
    Operator: UserIcon,
  };

  const UserRoleIcon = ({ role, className }: { role: User['role'], className?: string }) => {
    const Icon = roleIcons[role] || UserIcon;
    return <Icon className={cn("h-4 w-4 text-muted-foreground", className)} />;
  };

  // User Management Handlers
  const handleSaveUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const userData: Partial<User> & { password?: string } = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      employeeId: formData.get("employeeId") as string,
      role: formData.get("role") as User['role'],
    };

    const password = formData.get("password") as string;
    if (password) {
      userData.password = password;
    }

    const url = selectedUser ? `/api/users/${selectedUser.id}` : '/api/users';
    const method = selectedUser ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error('Failed to save user');
      }

      const savedUser = await response.json();

      if (selectedUser) {
        setUsers(users.map((u) => u.id === savedUser.id ? savedUser : u));
      } else {
        setUsers([...users, savedUser]);
      }
      toast({ title: `User ${selectedUser ? 'updated' : 'created'} successfully.` });
    } catch (error) {
      toast({ variant: "destructive", title: 'Error saving user', description: (error as Error).message });
    }


    setIsUserFormOpen(false);
    setSelectedUser(null);
  };

  const openEditUserDialog = (user: User) => {
    setSelectedUser(user);
    setIsUserFormOpen(true);
  };

  const openDeleteUserConfirm = (user: User) => {
    setSelectedUser(user);
    setIsUserConfirmOpen(true);
  };

  const handleDeleteUser = async () => {
    if (selectedUser) {
        try {
            // Also remove user from any teams they are in
            const updatedTeams = teams.map(team => ({
                ...team,
                memberIds: team.memberIds.filter(id => id !== selectedUser.id)
            }));
            
            // This is a simplification. In a real app, you might want to update teams on the server one by one.
            await Promise.all(updatedTeams.map(t => fetch(`/api/teams/${t.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(t)
            })));


            const response = await fetch(`/api/users/${selectedUser.id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete user');
            
            setUsers(users.filter((u) => u.id !== selectedUser.id));
            setTeams(updatedTeams);

            toast({ title: 'User deleted successfully.' });

        } catch (error) {
            toast({ variant: "destructive", title: 'Error deleting user', description: (error as Error).message });
        }
      setIsUserConfirmOpen(false);
      setSelectedUser(null);
    }
  };

  const openNewUserDialog = () => {
    setSelectedUser(null);
    setIsUserFormOpen(true);
  };

  const getUserTeams = (userId: string) => {
    return teams.filter(team => team.memberIds.includes(userId));
  }
  
  // Team Management Handlers
  const handleSaveTeam = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentTeam.name || !currentTeam.memberIds) return;

    const url = selectedTeam ? `/api/teams/${selectedTeam.id}` : '/api/teams';
    const method = selectedTeam ? 'PUT' : 'POST';

    try {
        const teamId = selectedTeam?.id || currentTeam.id;

        // Find operators that need to be moved
        const operatorsToMove = currentTeam.memberIds
            .map(id => users.find(u => u.id === id))
            .filter(u => u?.role === 'Operator');

        let allTeams = [...teams];

        for (const operator of operatorsToMove) {
            if (!operator) continue;

            const oldTeam = allTeams.find(t => t.id !== teamId && t.memberIds.includes(operator.id));
            if (oldTeam) {
                // Remove from old team
                const updatedOldTeam = {
                    ...oldTeam,
                    memberIds: oldTeam.memberIds.filter(id => id !== operator.id)
                };
                const res = await fetch(`/api/teams/${oldTeam.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedOldTeam),
                });
                if (!res.ok) throw new Error(`Failed to update ${oldTeam.name}`);
                
                allTeams = allTeams.map(t => t.id === oldTeam.id ? updatedOldTeam : t);
            }
        }
        
        // Save the current team
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentTeam),
        });

        if (!response.ok) {
            throw new Error('Failed to save team');
        }

        const savedTeam = await response.json();
        
        if (selectedTeam) {
            allTeams = allTeams.map((t) => t.id === savedTeam.id ? savedTeam : t);
        } else {
            allTeams.push(savedTeam);
        }

        setTeams(allTeams);
        toast({ title: `Team ${selectedTeam ? 'updated' : 'created'} successfully.` });
        
    } catch (error) {
        toast({ variant: "destructive", title: 'Error saving team', description: (error as Error).message });
    }

    closeTeamForm();
  };

  const openEditTeamDialog = (team: Team) => {
    setSelectedTeam(team);
    setCurrentTeam(JSON.parse(JSON.stringify(team)));
    setIsTeamFormOpen(true);
  };
  
  const openNewTeamDialog = () => {
    setSelectedTeam(null);
    setCurrentTeam({ name: '', memberIds: [] });
    setIsTeamFormOpen(true);
  };

  const openDeleteTeamConfirm = (team: Team) => {
    setSelectedTeam(team);
    setIsTeamConfirmOpen(true);
  };

  const handleDeleteTeam = async () => {
    if (selectedTeam) {
      try {
        const response = await fetch(`/api/teams/${selectedTeam.id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete team');
        
        setTeams(teams.filter((t) => t.id !== selectedTeam.id));
        toast({ title: 'Team deleted successfully.' });
      } catch (error) {
        toast({ variant: "destructive", title: 'Error deleting team', description: (error as Error).message });
      }
      setIsTeamConfirmOpen(false);
      setSelectedTeam(null);
    }
  };
  
  const closeTeamForm = () => {
    setIsTeamFormOpen(false);
    setSelectedTeam(null);
    setCurrentTeam({ name: '', memberIds: [] });
  }

  const isOperatorInAnotherTeam = (userId: string, currentTeamId: string | undefined) => {
    const operator = users.find(u => u.id === userId);
    if (!operator || operator.role !== 'Operator') {
      return false;
    }
    return teams.some(team => team.id !== currentTeamId && team.memberIds.includes(userId));
  };


  const handleMemberSelection = (userId: string, checked: boolean | 'indeterminate') => {
    if (checked) {
      setCurrentTeam({ ...currentTeam, memberIds: [...(currentTeam.memberIds || []), userId] });
    } else {
      setCurrentTeam({ ...currentTeam, memberIds: (currentTeam.memberIds || []).filter(id => id !== userId) });
    }
  };
  
  const getTeamMembers = (memberIds: string[]) => {
    return users.filter(user => memberIds.includes(user.id)).sort((a, b) => a.name.localeCompare(b.name));
  };

  const openRemoveMemberConfirm = (team: Team, memberId: string) => {
    setMemberToRemove({ team, memberId });
    setIsRemoveMemberConfirmOpen(true);
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    const { team, memberId } = memberToRemove;

    const updatedTeam = {
      ...team,
      memberIds: team.memberIds.filter(id => id !== memberId)
    };

    try {
      const response = await fetch(`/api/teams/${team.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTeam),
      });

      if (!response.ok) throw new Error('Failed to remove member from team');
      
      setTeams(teams.map(t => t.id === team.id ? updatedTeam : t));
      toast({ title: "Member removed successfully." });

    } catch (error) {
      toast({ variant: "destructive", title: 'Error removing member', description: (error as Error).message });
    }
    
    setIsRemoveMemberConfirmOpen(false);
    setMemberToRemove(null);
  };

  const [openTeamMembers, setOpenTeamMembers] = useState<Record<string, boolean>>({});
  const toggleTeamMembers = (teamId: string) => {
    setOpenTeamMembers(prev => ({...prev, [teamId]: !prev[teamId]}));
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="User & Team Management"
        description="Administer your workforce, roles, and production teams."
      />
      <Tabs defaultValue="users">
        <div className="flex justify-between items-center">
            <TabsList>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="teams">Teams</TabsTrigger>
            </TabsList>
            <TabsContent value="users" className="m-0">
                 <Button onClick={openNewUserDialog}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New User
                </Button>
            </TabsContent>
             <TabsContent value="teams" className="m-0">
                 <Button onClick={openNewTeamDialog}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Team
                </Button>
            </TabsContent>
        </div>
        <TabsContent value="users">
          <div className="mb-4">
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
          {/* Mobile View - Cards */}
          <div className="md:hidden grid gap-4">
            {filteredUsers.map(user => {
               const userTeams = getUserTeams(user.id);
               return (
                <Card key={user.id}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                           <div className="flex items-center gap-4">
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                    <UserRoleIcon role={user.role} className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">{user.name}</CardTitle>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                            </div>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openEditUserDialog(user)}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openDeleteUserConfirm(user)} className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div>
                            <p className="text-sm font-medium">Role</p>
                             <Badge variant={user.role === 'Admin' ? 'default' : 'secondary'} className="flex gap-2 items-center w-fit">
                                <UserRoleIcon role={user.role} className="h-3 w-3" />
                                {user.role}
                             </Badge>
                        </div>
                        <div>
                            <p className="text-sm font-medium">Teams</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {userTeams.length > 0 ? (
                                    userTeams.map(team => (
                                    <Badge key={team.id} variant="outline">{team.name}</Badge>
                                    ))
                                ) : (
                                    <span className="text-muted-foreground text-sm">No teams</span>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )})}
             {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No users found.
              </div>
            )}
          </div>

          {/* Desktop View - Table */}
          <Card className="hidden md:block">
              <CardContent className="pt-6">
              <Table>
                  <TableHeader>
                  <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Teams</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                  </TableHeader>
                  <TableBody>
                  {filteredUsers.map((user) => {
                      const userTeams = getUserTeams(user.id);
                      return (
                      <TableRow key={user.id}>
                      <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                <UserRoleIcon role={user.role} className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-medium">{user.name}</span>
                                <span className="text-sm text-muted-foreground">{user.email}</span>
                            </div>
                          </div>
                      </TableCell>
                      <TableCell>
                          <Badge variant={user.role === 'Admin' ? 'default' : 'secondary'} className="flex gap-2 items-center w-fit">
                            <UserRoleIcon role={user.role} className="h-3 w-3" />
                            {user.role}
                          </Badge>
                      </TableCell>
                      <TableCell>
                          <div className="flex flex-wrap gap-1">
                          {userTeams.length > 0 ? (
                              userTeams.map(team => (
                              <Badge key={team.id} variant="outline">{team.name}</Badge>
                              ))
                          ) : (
                              <span className="text-muted-foreground text-sm">Not assigned</span>
                          )}
                          </div>
                      </TableCell>
                      <TableCell>
                          <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditUserDialog(user)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                              onClick={() => openDeleteUserConfirm(user)}
                              className="text-destructive"
                              >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                      </TableRow>
                  )})}
                   {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No users found matching your search.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
              </Table>
              </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="teams">
           {/* Mobile View - Cards */}
           <div className="md:hidden grid gap-4">
              {teams.map(team => {
                 const members = getTeamMembers(team.memberIds);
                 const isOpen = openTeamMembers[team.id];
                 return (
                    <Card key={team.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                           <div className="flex items-center gap-4 flex-1">
                                <div className="flex flex-col">
                                    <CardTitle className="text-lg">{team.name}</CardTitle>
                                    <p className="text-sm text-muted-foreground">{team.memberIds.length} members</p>
                                </div>
                            </div>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openEditTeamDialog(team)}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openDeleteTeamConfirm(team)} className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                      </CardHeader>
                      {isOpen && (
                          <CardContent>
                            <ul className="space-y-3">
                              {members.map(member => (
                                <li key={member.id} className="flex items-center justify-between gap-3 group">
                                  <div className="flex items-center gap-3">
                                    <div>
                                      <div className="font-medium">{member.name}</div>
                                      <div className="text-sm text-muted-foreground">{member.email}</div>
                                    </div>
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                        <UserRoleIcon role={member.role} className="h-3 w-3" />
                                        {member.role}
                                    </Badge>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Open menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => openEditUserDialog(member)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        <span>Edit User</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openRemoveMemberConfirm(team, member.id)} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Remove from team</span>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                      )}
                      {members.length > 0 && (
                        <CardFooter>
                            <Button variant="ghost" className="w-full" onClick={() => toggleTeamMembers(team.id)}>
                                {isOpen ? 'Hide Members' : 'Show Members'}
                                {isOpen ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
                            </Button>
                        </CardFooter>
                      )}
                    </Card>
                 )
              })}
           </div>

           {/* Desktop View - Accordion */}
           <Card className="hidden md:block">
                <CardContent className="pt-6">
                <Accordion type="single" collapsible className="w-full">
                  {teams.map((team) => {
                      const members = getTeamMembers(team.memberIds);
                      return (
                      <AccordionItem value={team.id} key={team.id}>
                          <div className="flex w-full items-center justify-between pr-4 border-b">
                          <AccordionTrigger className="flex-1 text-left py-2 font-medium hover:no-underline">
                              <div className="flex items-center gap-4">
                                <span className="font-medium text-left text-lg">{team.name}</span>
                                <div className="flex items-center gap-2">
                                  {team.memberIds.length > 0 && <span className="text-sm text-muted-foreground">({team.memberIds.length} members)</span>}
                                </div>
                              </div>
                          </AccordionTrigger>
                          <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditTeamDialog(team)}>
                                  <Edit className="mr-2 h-4 w-4" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                  onClick={() => openDeleteTeamConfirm(team)}
                                  className="text-destructive"
                                  >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                              </DropdownMenuContent>
                              </DropdownMenu>
                          </div>
                          </div>
                          <AccordionContent>
                              {members.length > 0 ? (
                                <ul className="pt-2 px-4 space-y-3">
                                  {members.map(member => (
                                    <li key={member.id} className="flex items-center justify-between gap-3 group">
                                      <div className="flex items-center gap-3">
                                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                            <UserRoleIcon role={member.role} className="h-5 w-5" />
                                        </div>
                                        <div>
                                          <div className="font-medium">{member.name}</div>
                                          <div className="text-sm text-muted-foreground">{member.email}</div>
                                        </div>
                                         <Badge variant="secondary" className="flex items-center gap-1">
                                            <UserRoleIcon role={member.role} className="h-3 w-3" />
                                            {member.role}
                                         </Badge>
                                      </div>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => openEditUserDialog(member)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            <span>Edit User</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => openRemoveMemberConfirm(team, member.id)}
                                            className="text-destructive"
                                          >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            <span>Remove from team</span>
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="text-center py-4 text-muted-foreground">
                                  No members in this team.
                                </div>
                              )}
                          </AccordionContent>
                      </AccordionItem>
                      )
                  })}
                  </Accordion>
                  {teams.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No teams found. Add a new team to get started.
                      </div>
                  )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>


      {/* User Modals */}
      <Dialog
        open={isUserFormOpen}
        onOpenChange={(isOpen) => {
          setIsUserFormOpen(isOpen);
          if (!isOpen) setSelectedUser(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedUser ? "Edit" : "Add"} User</DialogTitle>
            <DialogDescription>
              {selectedUser
                ? "Update the details for the user."
                : "Fill in the details for the new user."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveUser}>
            <div className="grid gap-4 py-4">
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="id" className="text-right">
                  System ID
                </Label>
                <Input
                  id="id"
                  name="id"
                  className="col-span-3"
                  defaultValue={selectedUser?.id}
                  disabled
                  placeholder="Auto-generated"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Full Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  className="col-span-3"
                  defaultValue={selectedUser?.name}
                  required
                />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="employeeId" className="text-right">
                  Employee ID
                </Label>
                <Input
                  id="employeeId"
                  name="employeeId"
                  className="col-span-3"
                  defaultValue={selectedUser?.employeeId}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  className="col-span-3"
                  defaultValue={selectedUser?.email}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">
                      Password
                  </Label>
                  <Input
                      id="password"
                      name="password"
                      type="password"
                      className="col-span-3"
                      placeholder={selectedUser ? "Leave blank to keep current" : ""}
                  />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Role
                </Label>
                <Select name="role" defaultValue={selectedUser?.role} required>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Supervisor">Supervisor</SelectItem>
                    <SelectItem value="Operator">Operator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Save User</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isUserConfirmOpen} onOpenChange={setIsUserConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              user and remove them from any teams.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedUser(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    {/* Team Modals */}
     <Dialog open={isTeamFormOpen} onOpenChange={(isOpen) => { if (!isOpen) closeTeamForm(); else setIsTeamFormOpen(isOpen); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedTeam ? "Edit" : "Add New"} Team</DialogTitle>
            <DialogDescription>
              {selectedTeam ? "Update the team name and members." : "Enter a name for the new team and select its members."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTeam}>
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Team Name</Label>
                <Input 
                  id="name" 
                  value={currentTeam.name || ''} 
                  onChange={(e) => setCurrentTeam({ ...currentTeam, name: e.target.value })}
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label>Members</Label>
                <Card>
                  <CardContent className="p-4 space-y-4 max-h-60 overflow-y-auto">
                    <TooltipProvider>
                      {users.map(user => {
                        const isMemberOfAnotherTeam = isOperatorInAnotherTeam(user.id, selectedTeam?.id);
                        const isChecked = currentTeam.memberIds?.includes(user.id);
                        const userRole = users.find(u => u.id === user.id)?.role;
                        const isDisabled = userRole === 'Operator' && isMemberOfAnotherTeam && !isChecked;
                        
                        const CheckboxWrapper = ({ children }: { children: React.ReactNode }) => {
                          if (isDisabled) {
                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>{children}</TooltipTrigger>
                                <TooltipContent>
                                  <p>This operator is in another team. Selecting them will move them to this team upon saving.</p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          }
                          if (userRole === 'Operator' && isMemberOfAnotherTeam && isChecked) {
                             return (
                              <Tooltip>
                                <TooltipTrigger asChild>{children}</TooltipTrigger>
                                <TooltipContent>
                                  <p>This operator will be moved to this team upon saving.</p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          }
                          return <>{children}</>;
                        };

                        return (
                          <div key={user.id} className="flex items-center space-x-2">
                            <CheckboxWrapper>
                              <div className="flex items-center">
                                <Checkbox
                                  id={`user-${user.id}`}
                                  checked={isChecked}
                                  onCheckedChange={(checked) => handleMemberSelection(user.id, checked)}
                                />
                                <Label htmlFor={`user-${user.id}`} className="flex items-center gap-2 font-normal ml-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                  {user.name} 
                                  <span className="text-xs text-muted-foreground">{user.email}</span>
                                </Label>
                              </div>
                            </CheckboxWrapper>
                          </div>
                        )
                      })}
                    </TooltipProvider>
                  </CardContent>
                </Card>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={closeTeamForm}>Cancel</Button>
              <Button type="submit">Save Team</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isTeamConfirmOpen} onOpenChange={setIsTeamConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the team.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedTeam(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTeam}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isRemoveMemberConfirmOpen} onOpenChange={setIsRemoveMemberConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {users.find(u => u.id === memberToRemove?.memberId)?.name} from the team {memberToRemove?.team.name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToRemove(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
