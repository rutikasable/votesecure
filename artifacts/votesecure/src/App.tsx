import { type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BarChart, Bar, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import { Activity as ActivityIcon, ArrowLeft, ArrowRight, BarChart3, Bell, CalendarDays, Check, CheckCircle2, ChevronDown, ClipboardCheck, Clock3, Edit3, FileText, Filter, Globe2, HelpCircle, LayoutDashboard, Loader2, LogIn, LogOut, Menu, MoreHorizontal, Plus, RotateCw, Search, Settings, ShieldCheck, Trash2, TrendingUp, UserCheck, Users, Vote, X } from 'lucide-react';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import {
  registerUser,
  getElections,
  getElectionById,
  createElection,
  updateElection,
  deleteElection,
  getCandidates,
  getCandidateById,
  getCandidatesByElection,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  castVote,
  getElectionVoteStatus,
  getElectionResults,
  getAdminStats,
  getAdminVoters,
  getVoteHistory,
  ApiError,
  type Election as ApiElection,
  type Candidate as ApiCandidate,
  type ElectionResults as ApiElectionResults,
  type AdminStats,
  type AdminElectionSummary,
  type AdminVoterRecord,
  type VoteHistoryItem,
} from '@/services/api';
import { useAuth, AuthProvider } from '@/context/AuthContext';
import { activities as seedActivities, type Activity } from '@/data/mockData';

const queryClient = new QueryClient();

function Button({ children, variant = 'primary', className = '', ...props }: { children: ReactNode; variant?: 'primary'|'secondary'|'ghost'|'danger'; className?: string; [key: string]: unknown }) {
  const styles = { primary:'bg-[hsl(var(--primary))] text-white hover:bg-[#18365f]', secondary:'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[#dbe7ef]', ghost:'bg-transparent text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]', danger:'bg-[#fff1f0] text-[#a53531] hover:bg-[#ffe3e1]' };
  return <button className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`} {...props}>{children}</button>;
}
function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral'|'active'|'success'|'blue'|'danger' }) {
  const c = { neutral:'bg-slate-100 text-slate-600', active:'bg-[#e3f2f6] text-[#17617a]', success:'bg-[#e4f2eb] text-[#286649]', blue:'bg-[#e5ebf7] text-[#244c84]', danger:'bg-[#fae6e3] text-[#a13832]' };
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${c[tone]}`}><span className={`h-1.5 w-1.5 rounded-full ${tone==='success'?'bg-[#37805b]':tone==='danger'?'bg-[#ba443e]':tone==='active'?'bg-[#2085a4]':'bg-current opacity-60'}`} />{children}</span>;
}
function Brand({ inverse = false }: { inverse?: boolean }) {
  return <Link href="/" data-testid="link-brand" className="flex items-center gap-3"><span className={`grid h-9 w-9 place-items-center rounded-md ${inverse ? 'bg-[#2d7894]' : 'bg-[hsl(var(--primary))]'}`}><ShieldCheck className="h-5 w-5 text-white" /></span><span className={`font-display text-xl font-bold tracking-tight ${inverse ? 'text-white' : 'text-[hsl(var(--primary))]'}`}>VoteSecure</span></Link>;
}
function PublicNav() {
  const [open,setOpen] = useState(false);
  return <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8"><Brand /><nav className="hidden items-center gap-7 md:flex"><a href="#how-it-works" className="text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]" data-testid="link-how">How it works</a><a href="#trust" className="text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]" data-testid="link-trust">Our promise</a><Link href="/admin/login" className="text-sm font-medium text-[hsl(var(--muted-foreground))]" data-testid="link-admin-entry">Administration</Link></nav><div className="hidden items-center gap-2 sm:flex"><Link href="/login" data-testid="link-login"><Button variant="ghost">Sign in</Button></Link><Link href="/register" data-testid="link-register"><Button>Register to vote <ArrowRight className="h-4 w-4" /></Button></Link></div><button onClick={()=>setOpen(!open)} className="rounded-md p-2 md:hidden" data-testid="button-mobile-menu"><Menu className="h-5 w-5" /></button></div>{open&&<div className="border-t px-5 py-4 md:hidden"><div className="grid gap-3"><a href="#how-it-works" onClick={()=>setOpen(false)} className="py-2 text-sm" data-testid="link-mobile-how">How it works</a><Link href="/login" onClick={()=>setOpen(false)} className="py-2 text-sm" data-testid="link-mobile-login">Sign in</Link><Link href="/register" onClick={()=>setOpen(false)} className="py-2 text-sm font-semibold" data-testid="link-mobile-register">Register to vote</Link></div></div>}</header>;
}
function PublicLayout({ children }: { children: ReactNode }) { return <div className="min-h-[100dvh] bg-[hsl(var(--background))]"><PublicNav />{children}<footer className="border-t bg-[#edf3f6]"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-[hsl(var(--muted-foreground))] sm:flex-row sm:items-center sm:justify-between lg:px-8"><Brand /><span>© 2026 VoteSecure. A clearer way to participate.</span><div className="flex gap-4"><a href="#trust" data-testid="link-privacy">Privacy</a><a href="#trust" data-testid="link-accessibility">Accessibility</a></div></div></footer></div>; }

const voterNav = [{href:'/voter/dashboard',label:'Overview',icon:LayoutDashboard},{href:'/voter/elections',label:'Elections',icon:Vote},{href:'/voter/confirmation',label:'My activity',icon:ClipboardCheck}];
const adminNav = [{href:'/admin/dashboard',label:'Dashboard',icon:LayoutDashboard},{href:'/admin/elections',label:'Elections',icon:CalendarDays},{href:'/admin/candidates',label:'Candidates',icon:Users},{href:'/admin/voters',label:'Voters',icon:UserCheck},{href:'/admin/results',label:'Results',icon:BarChart3}];
function SideNav({ admin = false, mobileOpen, onClose }: { admin?: boolean; mobileOpen?: boolean; onClose?: ()=>void }) {
  const [location, setLocation] = useLocation();
  const { logout } = useAuth();
  const links = admin ? adminNav : voterNav;
  return (
    <aside className={`${mobileOpen?'fixed inset-y-0 left-0 z-50 flex':'hidden'} w-64 flex-col bg-[hsl(var(--sidebar))] p-5 text-[hsl(var(--sidebar-foreground))] md:flex`}>
      <div className="mb-10 flex items-center justify-between"><Brand inverse />{onClose&&<button onClick={onClose} className="md:hidden" data-testid="button-close-menu"><X className="h-5 w-5" /></button>}</div>
      <p className="label-caps mb-3 text-[#9eb9cb]">{admin?'Administration':'Voter portal'}</p>
      <nav className="grid gap-1">{links.map(({href,label,icon:Icon})=><Link key={href} href={href} onClick={onClose} data-testid={`link-nav-${label.toLowerCase()}`} className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors ${location===href?'bg-[hsl(var(--sidebar-accent))] text-white':'text-[#c0d3df] hover:bg-white/10 hover:text-white'}`}><Icon className="h-[18px] w-[18px]" />{label}</Link>)}</nav>
      <div className="mt-auto border-t border-white/15 pt-4">
        <Link href={admin?'/admin/login':'/login'} data-testid="link-shell-settings" className="flex items-center gap-3 rounded-md px-3 py-3 text-sm text-[#c0d3df] hover:bg-white/10"><Settings className="h-[18px] w-[18px]" />Settings</Link>
        <button
          type="button"
          onClick={() => {
            logout();
            setLocation(admin ? '/admin/login' : '/login');
          }}
          data-testid="link-shell-logout"
          className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm text-[#c0d3df] hover:bg-white/10"
        >
          <LogOut className="h-[18px] w-[18px]" />Sign out
        </button>
      </div>
    </aside>
  );
}
function AppShell({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const [mobileOpen,setMobileOpen] = useState(false);
  const { user } = useAuth();
  const initials = user?.name ? user.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : (admin ? 'AD' : 'AM');
  const displayName = user?.name || (admin ? 'Alex Duarte' : 'Avery Morgan');

  return (
    <div className="flex min-h-[100dvh] bg-[hsl(var(--background))]">
      <SideNav admin={admin} mobileOpen={mobileOpen} onClose={()=>setMobileOpen(false)} />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b bg-[hsl(var(--card))]/95 px-5 backdrop-blur lg:px-8">
          <button onClick={()=>setMobileOpen(true)} className="mr-3 rounded-md p-2 md:hidden" data-testid="button-open-menu"><Menu className="h-5 w-5" /></button>
          <div className="hidden md:block">
            <p className="label-caps text-[hsl(var(--muted-foreground))]">{admin?'Civic administration':'Welcome back'}</p>
            <p className="font-display text-xl font-semibold">{admin?'Stewardship dashboard':'Your voting space'}</p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <button className="relative rounded-md p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]" data-testid="button-notifications"><Bell className="h-5 w-5" /><span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#2d7894]" /></button>
            <div className="hidden items-center gap-2 border-l pl-4 sm:flex">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#dbeaf0] text-sm font-bold text-[hsl(var(--primary))]">{initials}</span>
              <span className="text-sm font-semibold">{displayName}</span>
              <ChevronDown className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
function SectionTitle({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) { return <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div>{eyebrow&&<p className="label-caps mb-2 text-[#2d7894]">{eyebrow}</p>}<h1 className="font-display text-3xl font-bold tracking-tight text-[hsl(var(--primary))] sm:text-4xl">{title}</h1>{description&&<p className="mt-2 max-w-2xl text-[hsl(var(--muted-foreground))]">{description}</p>}</div>{action}</div>; }
function StatCard({ label, value, note, icon:Icon, tone='blue' }: { label:string; value:string; note:string; icon:typeof Vote; tone?:string }) { return <div className="border bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-sm)]"><div className="flex items-start justify-between"><div><p className="text-sm text-[hsl(var(--muted-foreground))]">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-[hsl(var(--primary))]">{value}</p></div><span className={`grid h-10 w-10 place-items-center rounded-md ${tone==='green'?'bg-[#e4f2eb] text-[#357a58]':'bg-[#e3f0f5] text-[#28758f]'}`}><Icon className="h-5 w-5" /></span></div><p className="mt-4 text-xs text-[hsl(var(--muted-foreground))]">{note}</p></div>; }

function Home() { return <PublicLayout><section className="page-grid relative overflow-hidden"><div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-28"><div className="animate-enter"><div className="mb-6 flex items-center gap-2 text-sm font-semibold text-[#28758f]"><span className="h-2 w-2 rounded-full bg-[#37805b]" />A public service for participation</div><h1 className="font-display max-w-2xl text-5xl font-bold leading-[1.02] tracking-[-.03em] text-[hsl(var(--primary))] sm:text-7xl">Your voice, <em className="font-normal text-[#28758f]">verified.</em></h1><p className="mt-7 max-w-xl text-lg leading-8 text-[hsl(var(--muted-foreground))]">VoteSecure gives students and community members a clear, private path from registration to recorded ballot.</p><div className="mt-9 flex flex-wrap gap-3"><Link href="/register" data-testid="link-hero-register"><Button className="px-5 py-3">Register to vote <ArrowRight className="h-4 w-4" /></Button></Link><Link href="/login" data-testid="link-hero-login"><Button variant="secondary" className="px-5 py-3">I have an account</Button></Link></div><div className="mt-10 flex items-center gap-3 text-sm text-[hsl(var(--muted-foreground))]"><ShieldCheck className="h-5 w-5 text-[#37805b]" />Private by design. Your choice is never shown in your activity.</div></div><div className="animate-enter-delay relative"><div className="absolute -inset-5 bg-[#dcecf0] opacity-60 blur-3xl" /><div className="relative border border-[#bdd5df] bg-[#f8fcfc] p-7 shadow-[var(--shadow-md)]"><div className="flex items-center justify-between border-b pb-5"><div><p className="label-caps text-[#28758f]">Today’s civic moment</p><p className="mt-1 font-display text-2xl font-semibold text-[hsl(var(--primary))]">One clear choice.</p></div><span className="grid h-10 w-10 place-items-center rounded-full bg-[#e4f2eb] text-[#357a58]"><CheckCircle2 className="h-5 w-5" /></span></div><div className="py-7"><div className="mb-3 flex justify-between text-sm"><span className="font-semibold">Student Council Election 2026</span><Badge tone="active">Open now</Badge></div><div className="h-2 overflow-hidden bg-[#dbe7ea]"><div className="h-full w-[65%] bg-[#28758f]" /></div><div className="mt-3 flex justify-between text-xs text-[hsl(var(--muted-foreground))]"><span>817 ballots recorded</span><span>3 days left</span></div></div><div className="grid grid-cols-3 gap-2 border-t pt-5 text-center"><div><p className="text-xl font-bold text-[hsl(var(--primary))]">01</p><p className="text-xs text-[hsl(var(--muted-foreground))]">select</p></div><div><p className="text-xl font-bold text-[hsl(var(--primary))]">02</p><p className="text-xs text-[hsl(var(--muted-foreground))]">review</p></div><div><p className="text-xl font-bold text-[hsl(var(--primary))]">03</p><p className="text-xs text-[hsl(var(--muted-foreground))]">record</p></div></div></div></div></div></section><section id="trust" className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]"><div><p className="label-caps mb-3 text-[#28758f]">Our promise</p><h2 className="font-display max-w-md text-4xl font-bold leading-tight text-[hsl(var(--primary))]">Confidence at every step.</h2><p className="mt-4 max-w-md leading-7 text-[hsl(var(--muted-foreground))]">No jargon, no guesswork. Every screen explains what is happening and what happens next.</p></div><div className="grid gap-4 sm:grid-cols-3"><InfoTile icon={ShieldCheck} title="Private" text="We show participation status, never your candidate choice."/><InfoTile icon={Globe2} title="Accessible" text="Designed for keyboard, mobile, and everyday connection speeds."/><InfoTile icon={FileText} title="Transparent" text="A receipt confirms your ballot without exposing how you voted."/></div></div></section><section id="how-it-works" className="bg-[#e8f0f3]"><div className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="mb-12 max-w-xl"><p className="label-caps mb-3 text-[#28758f]">How it works</p><h2 className="font-display text-4xl font-bold text-[hsl(var(--primary))]">A calm three-step process.</h2></div><div className="grid gap-0 border-y border-[#cbdbe1] md:grid-cols-3"><Step n="01" title="Find your election" text="See what is open, what is coming up, and when each voting window closes."/><Step n="02" title="Make your choice" text="Read candidate profiles, choose once, and review before anything is recorded."/><Step n="03" title="Keep your receipt" text="Get a private ballot reference so you can trust that your participation is counted."/></div></div></section><section className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="flex flex-col items-start justify-between gap-8 border-l-4 border-[#28758f] pl-7 sm:flex-row sm:items-center"><div><p className="font-display text-3xl font-bold text-[hsl(var(--primary))]">Ready when you are.</p><p className="mt-2 text-[hsl(var(--muted-foreground))]">Participation starts with a single registration.</p></div><Link href="/register" data-testid="link-bottom-register"><Button>Start registration <ArrowRight className="h-4 w-4" /></Button></Link></div></section></PublicLayout>; }
function InfoTile({ icon:Icon, title, text }: { icon:typeof Vote; title:string; text:string }) { return <div className="border bg-[hsl(var(--card))] p-5"><Icon className="mb-6 h-6 w-6 text-[#28758f]" /><h3 className="font-semibold text-[hsl(var(--primary))]">{title}</h3><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{text}</p></div>; }
function Step({ n,title,text }: { n:string; title:string; text:string }) { return <div className="border-r border-[#cbdbe1] px-2 py-7 last:border-0 md:px-7"><span className="font-mono text-sm font-bold text-[#28758f]">{n}</span><h3 className="mt-6 font-display text-2xl font-bold text-[hsl(var(--primary))]">{title}</h3><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{text}</p></div>; }

function AuthLayout({ children, admin=false }: { children:ReactNode; admin?:boolean }) { return <div className="grid min-h-[100dvh] lg:grid-cols-[.85fr_1.15fr]"><div className={`hidden flex-col justify-between p-10 lg:flex ${admin?'bg-[hsl(var(--primary))]':'bg-[#e8f1f3]'}`}><Brand inverse={admin}/><div className="max-w-md">{admin?<><p className="label-caps text-[#9eb9cb]">Trusted stewardship</p><h2 className="mt-4 font-display text-5xl font-bold leading-tight text-white">Good civic systems are easy to understand.</h2><p className="mt-6 leading-7 text-[#c0d3df]">A focused workspace for the people responsible for making every election clear, fair, and accountable.</p></>:<><p className="label-caps text-[#28758f]">Welcome to VoteSecure</p><h2 className="mt-4 font-display text-5xl font-bold leading-tight text-[hsl(var(--primary))]">Participation should feel straightforward.</h2><p className="mt-6 leading-7 text-[hsl(var(--muted-foreground))]">Your ballot is yours. We make the path to casting it simple and private.</p></>}</div><div className={`text-sm ${admin?'text-[#9eb9cb]':'text-[hsl(var(--muted-foreground))]'}`}>Secure access · Clear information · Human support</div></div><div className="flex flex-col bg-[hsl(var(--background))]"><div className="flex items-center justify-between px-5 py-5 lg:justify-end lg:px-12"><div className="lg:hidden"><Brand inverse={admin}/></div><Link href="/" className="text-sm text-[hsl(var(--muted-foreground))]" data-testid="link-auth-home"><ArrowLeft className="mr-2 inline h-4 w-4" />Back home</Link></div><div className="mx-auto flex w-full max-w-lg flex-1 items-center px-5 py-8 lg:px-10">{children}</div></div></div>; }

function Login({ admin = false }: { admin?: boolean }) {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter your email and password to continue.');
      return;
    }

    try {
      setLoading(true);
      const authenticatedUser = await login(trimmedEmail, password);
      // Role-based redirection derived strictly from verified backend authentication
      if (authenticatedUser.role === 'admin') {
        setLocation('/admin/dashboard');
      } else {
        setLocation('/voter/dashboard');
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError('Invalid email or password. Please check your credentials.');
        } else if (err.status === 400) {
          setError(err.message || 'Please check your email and password.');
        } else if (err.status === 500) {
          setError('Something went wrong on our servers. Please try again.');
        } else {
          setError(err.message || 'Sign in failed. Please try again.');
        }
      } else {
        setError(err.message || 'Unable to connect to the server. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout admin={admin}>
      <div className="w-full">
        <p className="label-caps mb-3 text-[#28758f]">{admin ? 'Administration' : 'Voter access'}</p>
        <h1 className="font-display text-4xl font-bold text-[hsl(var(--primary))]">{admin ? 'Sign in to administration' : 'Welcome back'}</h1>
        <p className="mt-3 text-[hsl(var(--muted-foreground))]">{admin ? 'Manage elections with care and clarity.' : 'Access your elections and voting activity.'}</p>
        <form onSubmit={submit} className="mt-8 grid gap-5">
          <label className="grid gap-2 text-sm font-semibold">
            Email address
            <input
              required
              disabled={loading}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              placeholder={admin ? 'admin@votesecure.org' : 'you@example.org'}
              className="h-12 rounded-md border bg-[hsl(var(--card))] px-3 font-normal outline-none focus:border-[#28758f] disabled:opacity-60"
              data-testid="input-login-email"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Password
            <input
              required
              disabled={loading}
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="Enter your password"
              className="h-12 rounded-md border bg-[hsl(var(--card))] px-3 font-normal outline-none focus:border-[#28758f] disabled:opacity-60"
              data-testid="input-login-password"
            />
          </label>
          {error && (
            <p className="rounded-md bg-[#fff1f0] p-3 text-sm text-[#a53531]" data-testid="status-login-error">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="mt-2 h-12"
            data-testid="button-submit-login"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {admin ? 'Signing in securely...' : 'Signing in...'}
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" /> {admin ? 'Sign in securely' : 'Sign in'}
              </>
            )}
          </Button>
        </form>
        {!admin && (
          <p className="mt-7 text-center text-sm text-[hsl(var(--muted-foreground))]">
            New to VoteSecure?{' '}
            <Link href="/register" className="font-semibold text-[#28758f]" data-testid="link-login-register">
              Register here
            </Link>
          </p>
        )}
        {admin && (
          <p className="mt-7 text-center text-sm text-[hsl(var(--muted-foreground))]">
            Need voter access?{' '}
            <Link href="/login" className="font-semibold text-[#28758f]" data-testid="link-admin-voter-login">
              Voter sign in
            </Link>
          </p>
        )}
      </div>
    </AuthLayout>
  );
}
function Register() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = form.password.length > 11 ? 3 : form.password.length > 7 ? 2 : form.password.length > 0 ? 1 : 0;
  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [key]: e.target.value });
    if (error) setError('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim();
    const trimmedMobile = form.mobile.trim();

    if (!trimmedName) {
      setError('Please enter your full name.');
      return;
    }

    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (trimmedMobile && !/^[0-9+\-\s()]{7,20}$/.test(trimmedMobile)) {
      setError('Please enter a valid mobile number or leave it blank.');
      return;
    }

    if (!form.password) {
      setError('Please enter a password.');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const payload: { name: string; email: string; password: string; mobile?: string } = {
        name: trimmedName,
        email: trimmedEmail,
        password: form.password,
      };
      if (trimmedMobile) {
        payload.mobile = trimmedMobile;
      }

      const res = await registerUser(payload);
      setSuccess(res.message || 'Account created successfully! Redirecting to sign in...');
      setTimeout(() => {
        setLocation('/login');
      }, 1500);
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('An account with this email address already exists.');
        } else if (err.status === 400) {
          setError(err.message || 'Please check your information and try again.');
        } else if (err.status === 500) {
          setError('Something went wrong. Please try again.');
        } else {
          setError(err.message || 'Registration failed. Please try again.');
        }
      } else {
        setError(err.message || 'Unable to connect to the server. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full">
        <p className="label-caps mb-3 text-[#28758f]">Voter registration</p>
        <h1 className="font-display text-4xl font-bold text-[hsl(var(--primary))]">Create your voter account</h1>
        <p className="mt-3 text-[hsl(var(--muted-foreground))]">You only need a few details. Your account keeps your ballot history private.</p>
        <form onSubmit={submit} className="mt-8 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">
            Full name
            <input
              required
              disabled={loading}
              value={form.name}
              onChange={update('name')}
              className="h-11 rounded-md border bg-[hsl(var(--card))] px-3 font-normal disabled:opacity-60"
              placeholder="Avery Morgan"
              data-testid="input-register-name"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Email address
            <input
              required
              disabled={loading}
              type="email"
              value={form.email}
              onChange={update('email')}
              className="h-11 rounded-md border bg-[hsl(var(--card))] px-3 font-normal disabled:opacity-60"
              placeholder="you@example.org"
              data-testid="input-register-email"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Mobile number (optional)
            <input
              disabled={loading}
              type="tel"
              value={form.mobile}
              onChange={update('mobile')}
              className="h-11 rounded-md border bg-[hsl(var(--card))] px-3 font-normal disabled:opacity-60"
              placeholder="9876543210"
              data-testid="input-register-mobile"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Password
            <input
              required
              disabled={loading}
              type="password"
              value={form.password}
              onChange={update('password')}
              className="h-11 rounded-md border bg-[hsl(var(--card))] px-3 font-normal disabled:opacity-60"
              placeholder="At least 8 characters"
              data-testid="input-register-password"
            />
            <span className="flex gap-1">
              {[1, 2, 3].map(n => (
                <span key={n} className={`h-1 flex-1 ${strength >= n ? 'bg-[#37805b]' : 'bg-[#dbe2e5]'}`} />
              ))}
            </span>
            <span className="text-xs font-normal text-[hsl(var(--muted-foreground))]">
              {strength === 3 ? 'Strong password' : strength === 2 ? 'Good — add a few more characters' : 'Use 8 or more characters'}
            </span>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Confirm password
            <input
              required
              disabled={loading}
              type="password"
              value={form.confirm}
              onChange={update('confirm')}
              className="h-11 rounded-md border bg-[hsl(var(--card))] px-3 font-normal disabled:opacity-60"
              data-testid="input-register-confirm"
            />
          </label>
          {error && (
            <p className="rounded-md bg-[#fff1f0] p-3 text-sm text-[#a53531]" data-testid="status-register-error">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-md bg-[#eaf5ef] p-3 text-sm text-[#276e48]" data-testid="status-register-success">
              {success}
            </p>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="mt-3 h-12"
            data-testid="button-submit-register"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Creating account...
              </>
            ) : (
              <>
                Create account <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
          Already registered?{' '}
          <Link href="/login" className="font-semibold text-[#28758f]" data-testid="link-register-login">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'TBA';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function VoterDashboard() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const activities = seedActivities;

  const [elections, setElections] = useState<ApiElection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        setLocation('/login');
      } else if (user?.role !== 'voter') {
        setLocation('/admin/dashboard');
      }
    }
  }, [authLoading, isAuthenticated, user, setLocation]);

  const fetchElectionsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getElections();
      setElections(res.elections || []);
    } catch (err: any) {
      setError(err.message || 'Unable to load elections. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchElectionsData();
  }, []);

  const activeElections = elections.filter((e) => e.status === 'active');
  const nextClosingElection = [...activeElections, ...elections.filter(e => e.status === 'upcoming')]
    .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())[0];

  return (
    <AppShell>
      <SectionTitle
        eyebrow="Voter overview"
        title={`Good morning, ${user?.name || 'Voter'}.`}
        description="Here’s what is happening in your civic space."
        action={
          <Link href="/voter/elections" data-testid="link-dashboard-directory">
            <Button>
              Browse elections <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Open elections"
          value={String(activeElections.length).padStart(2, '0')}
          note={activeElections.length > 0 ? `${activeElections.length} open for participation` : 'No open elections right now'}
          icon={Vote}
        />
        <StatCard
          label="Total elections"
          value={String(elections.length).padStart(2, '0')}
          note="In the civic registry"
          icon={ClipboardCheck}
          tone="green"
        />
        <StatCard
          label="Next closing date"
          value={nextClosingElection ? formatDate(nextClosingElection.end_date) : 'None'}
          note={nextClosingElection ? nextClosingElection.title : 'All elections concluded'}
          icon={Clock3}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
        <div className="border bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)]">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="label-caps text-[#28758f]">Needs your attention</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-[hsl(var(--primary))]">
                Active elections
              </h2>
            </div>
            <Link href="/voter/elections" className="text-sm font-semibold text-[#28758f]" data-testid="link-dashboard-see-all">
              See all
            </Link>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-[hsl(var(--muted-foreground))]">
              <Loader2 className="mb-3 h-7 w-7 animate-spin text-[#28758f]" />
              <p className="text-sm">Loading active elections...</p>
            </div>
          ) : error ? (
            <div className="rounded-md bg-[#fff1f0] p-5 text-center">
              <p className="text-sm text-[#a53531]">{error}</p>
              <Button variant="secondary" className="mt-3" onClick={fetchElectionsData}>
                Retry
              </Button>
            </div>
          ) : activeElections.length === 0 ? (
            <div className="border border-dashed p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
              <p className="font-semibold text-[hsl(var(--primary))]">No active elections at the moment</p>
              <p className="mt-1">Check back later or browse upcoming elections in the directory.</p>
              <Link href="/voter/elections" className="mt-4 inline-block font-semibold text-[#28758f]">
                Explore directory →
              </Link>
            </div>
          ) : (
            activeElections.map((e) => <ElectionRow key={e.id} election={e} />)
          )}
        </div>

        <div className="border bg-[hsl(var(--primary))] p-6 text-white">
          <p className="label-caps text-[#a8cfdb]">A simple reminder</p>
          <h2 className="mt-4 font-display text-2xl font-bold">Your vote is private.</h2>
          <p className="mt-3 text-sm leading-6 text-[#c6dae3]">
            VoteSecure records that you participated, never which candidate you selected.
          </p>
          <div className="mt-8 border-t border-white/20 pt-5 text-sm text-[#c6dae3]">
            <ShieldCheck className="mr-2 inline h-4 w-4 text-[#7bc39b]" />
            End-to-end ballot privacy
          </div>
        </div>
      </div>

      <div className="mt-8 border bg-[hsl(var(--card))] p-6">
        <div className="mb-4 flex items-center gap-3">
          <ActivityIcon className="h-5 w-5 text-[#28758f]" />
          <h2 className="font-display text-2xl font-bold text-[hsl(var(--primary))]">Recent activity</h2>
        </div>
        {activities.slice(0, 3).map((a) => (
          <ActivityRow activity={a} key={a.id} />
        ))}
      </div>
    </AppShell>
  );
}

function ElectionRow({ election }: { election: ApiElection }) {
  const statusTone = election.status === 'active' ? 'active' : election.status === 'ended' ? 'neutral' : 'blue';
  const statusLabel = election.status === 'active' ? 'Open now' : election.status === 'ended' ? 'Ended' : 'Upcoming';

  return (
    <div className="flex flex-col gap-4 border-t py-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-semibold text-[hsl(var(--primary))]">{election.title}</h3>
          <Badge tone={statusTone}>{statusLabel}</Badge>
        </div>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          Window: {formatDate(election.start_date)} — {formatDate(election.end_date)}
        </p>
      </div>
      <Link href={`/voter/elections/${election.id}`} data-testid={`link-election-${election.id}`}>
        <Button variant="secondary">
          View election <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}

function ActivityRow({ activity }: { activity: Activity }) {
  return (
    <div className="flex items-center gap-4 border-t py-4">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e4f2eb] text-[#357a58]">
        <Check className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{activity.label}</p>
        <p className="truncate text-sm text-[hsl(var(--muted-foreground))]">{activity.detail}</p>
      </div>
      <time className="text-xs text-[hsl(var(--muted-foreground))]">{activity.timestamp}</time>
    </div>
  );
}

function ElectionDirectory() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [elections, setElections] = useState<ApiElection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('soon');

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        setLocation('/login');
      } else if (user?.role !== 'voter') {
        setLocation('/admin/dashboard');
      }
    }
  }, [authLoading, isAuthenticated, user, setLocation]);

  const fetchElectionsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getElections();
      setElections(res.elections || []);
    } catch (err: any) {
      setError(err.message || 'Unable to load elections. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchElectionsData();
  }, []);

  const filtered = useMemo(() => {
    return elections
      .filter((e) => (filter === 'all' || e.status === filter) && e.title.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) =>
        sort === 'name'
          ? a.title.localeCompare(b.title)
          : new Date(a.end_date).getTime() - new Date(b.end_date).getTime()
      );
  }, [elections, search, filter, sort]);

  return (
    <AppShell>
      <SectionTitle
        eyebrow="Election directory"
        title="Find your election."
        description="Browse current and upcoming elections in one clear list."
      />
      <div className="mb-6 flex flex-col gap-3 rounded-md border bg-[hsl(var(--card))] p-3 sm:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search elections"
            className="h-10 w-full rounded border bg-[hsl(var(--background))] pl-9 pr-3 text-sm"
            data-testid="input-election-search"
          />
        </label>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-10 rounded border bg-[hsl(var(--background))] px-3 text-sm"
            data-testid="select-election-filter"
          >
            <option value="all">All statuses</option>
            <option value="active">Open now</option>
            <option value="upcoming">Upcoming</option>
            <option value="ended">Ended</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-10 rounded border bg-[hsl(var(--background))] px-3 text-sm"
            data-testid="select-election-sort"
          >
            <option value="soon">Closing soon</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-[hsl(var(--muted-foreground))]">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#28758f]" />
          <p className="text-sm">Loading elections...</p>
        </div>
      ) : error ? (
        <div className="rounded-md bg-[#fff1f0] p-8 text-center">
          <p className="font-semibold text-[#a53531]">{error}</p>
          <Button variant="secondary" className="mt-4" onClick={fetchElectionsData}>
            Retry loading
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No elections found" text="Try a different search or status filter." />
      ) : (
        <div className="grid gap-4">
          {filtered.map((e) => (
            <ElectionCard election={e} key={e.id} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function ElectionCard({ election }: { election: ApiElection }) {
  const ended = election.status === 'ended';
  const statusTone = election.status === 'active' ? 'active' : ended ? 'neutral' : 'blue';
  const statusLabel = election.status === 'active' ? 'Open now' : ended ? 'Ended' : 'Upcoming';

  return (
    <article className="border bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]">
      <div className="flex flex-col justify-between gap-5 md:flex-row">
        <div className="max-w-2xl">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Badge tone={statusTone}>{statusLabel}</Badge>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              {ended ? 'Closed' : 'Closes'} {formatDate(election.end_date)}
            </span>
          </div>
          <h2 className="font-display text-2xl font-bold text-[hsl(var(--primary))]">{election.title}</h2>
          {election.description && (
            <p className="mt-2 leading-6 text-[hsl(var(--muted-foreground))]">{election.description}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 md:items-end">
          {ended && (
            <Link href={`/voter/elections/${election.id}/results`} data-testid={`link-results-election-${election.id}`}>
              <Button variant="secondary">
                <BarChart3 className="h-4 w-4" /> View results
              </Button>
            </Link>
          )}
          <Link href={`/voter/elections/${election.id}`} data-testid={`link-directory-election-${election.id}`}>
            <Button variant={ended ? 'ghost' : 'primary'}>
              {ended ? 'Details' : election.status === 'active' ? 'View election' : 'View details'}{' '}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 border-t pt-4 text-sm text-[hsl(var(--muted-foreground))]">
        <span>
          <CalendarDays className="mr-2 inline h-4 w-4 text-[#28758f]" />
          {formatDate(election.start_date)} — {formatDate(election.end_date)}
        </span>
      </div>
    </article>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="border border-dashed bg-[hsl(var(--card))] px-6 py-14 text-center">
      <Search className="mx-auto h-8 w-8 text-[#7da8b7]" />
      <h2 className="mt-4 font-display text-2xl font-bold text-[hsl(var(--primary))]">{title}</h2>
      <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{text}</p>
    </div>
  );
}

function ElectionDetails() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [election, setElection] = useState<ApiElection | null>(null);
  const [loadingElection, setLoadingElection] = useState(true);
  const [electionError, setElectionError] = useState<string | null>(null);

  const [candidates, setCandidates] = useState<ApiCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        setLocation('/login');
      } else if (user?.role !== 'voter') {
        setLocation('/admin/dashboard');
      }
    }
  }, [authLoading, isAuthenticated, user, setLocation]);

  const fetchDetails = async () => {
    if (!id) return;
    try {
      setLoadingElection(true);
      setElectionError(null);
      const res = await getElectionById(id);
      setElection(res.election);
    } catch (err: any) {
      setElectionError(err.message || 'Election not found.');
    } finally {
      setLoadingElection(false);
    }

    try {
      setLoadingCandidates(true);
      setCandidateError(null);
      const candRes = await getCandidatesByElection(id);
      setCandidates(candRes.candidates || []);
    } catch (err: any) {
      setCandidateError(err.message || 'Unable to load candidates. Please try again.');
    } finally {
      setLoadingCandidates(false);
    }

    if (isAuthenticated && user?.role === 'voter') {
      try {
        const voteStatusRes = await getElectionVoteStatus(id);
        setHasVoted(voteStatusRes.has_voted);
      } catch (err) {
        // Non-fatal status check
      }
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  if (loadingElection) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20 text-[hsl(var(--muted-foreground))]">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#28758f]" />
          <p className="text-sm">Loading election details...</p>
        </div>
      </AppShell>
    );
  }

  if (electionError || !election) {
    return (
      <AppShell>
        <Link href="/voter/elections" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-[#28758f]">
          <ArrowLeft className="h-4 w-4" /> Back to elections
        </Link>
        <div className="rounded-md bg-[#fff1f0] p-8 text-center">
          <p className="font-semibold text-[#a53531]">{electionError || 'Election not found.'}</p>
          <Button variant="secondary" className="mt-4" onClick={() => setLocation('/voter/elections')}>
            Return to directory
          </Button>
        </div>
      </AppShell>
    );
  }

  const statusTone = election.status === 'active' ? 'active' : election.status === 'ended' ? 'neutral' : 'blue';
  const statusLabel = election.status === 'active' ? 'Open now' : election.status === 'ended' ? 'Ended' : 'Upcoming';

  return (
    <AppShell>
      <Link href="/voter/elections" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-[#28758f]" data-testid="link-back-elections">
        <ArrowLeft className="h-4 w-4" /> Back to elections
      </Link>
      <div className="max-w-4xl">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={statusTone}>{statusLabel}</Badge>
          {hasVoted && <Badge tone="success">Ballot Cast</Badge>}
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            {formatDate(election.start_date)} — {formatDate(election.end_date)}
          </span>
        </div>
        <h1 className="mt-4 font-display text-4xl font-bold text-[hsl(var(--primary))] sm:text-5xl">
          {election.title}
        </h1>
        {election.description && (
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[hsl(var(--muted-foreground))]">
            {election.description}
          </p>
        )}

        <div className="mt-7 flex flex-wrap items-center gap-3">
          {election.status === 'active' && !hasVoted && (
            <Link href={`/voter/vote/${election.id}`} data-testid="link-start-vote">
              <Button>
                Start your ballot <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
          {election.status === 'active' && hasVoted && (
            <div className="inline-flex items-center gap-2 rounded-md bg-[#eaf7ee] px-4 py-2.5 text-sm font-semibold text-[#2b6e49]">
              <ShieldCheck className="h-4 w-4" /> You have already voted in this election.
            </div>
          )}
          {election.status === 'upcoming' && (
            <div className="inline-flex items-center gap-2 rounded-md bg-[#eaf3f6] px-4 py-2.5 text-sm font-semibold text-[#1f667d]">
              <Clock3 className="h-4 w-4" /> Voting opens {formatDate(election.start_date)}.
            </div>
          )}
          {election.status === 'ended' && (
            <Link href={`/voter/elections/${election.id}/results`} data-testid="link-view-results">
              <Button variant="secondary">
                View election results <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="mt-14">
        <div className="mb-6">
          <p className="label-caps text-[#28758f]">The ballot</p>
          <h2 className="mt-1 font-display text-3xl font-bold text-[hsl(var(--primary))]">
            Meet the candidates
          </h2>
        </div>

        {loadingCandidates ? (
          <div className="flex flex-col items-center justify-center py-12 text-[hsl(var(--muted-foreground))]">
            <Loader2 className="mb-3 h-7 w-7 animate-spin text-[#28758f]" />
            <p className="text-sm">Loading candidates...</p>
          </div>
        ) : candidateError ? (
          <div className="rounded-md bg-[#fff1f0] p-6 text-center">
            <p className="text-sm text-[#a53531]">{candidateError}</p>
            <Button variant="secondary" className="mt-3" onClick={fetchDetails}>
              Retry loading candidates
            </Button>
          </div>
        ) : candidates.length === 0 ? (
          <div className="border border-dashed p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
            <p className="font-semibold text-[hsl(var(--primary))]">No candidates are available for this election.</p>
            <p className="mt-1">Candidates have not yet been registered for this election.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {candidates.map((c) => (
              <CandidateProfile candidate={c} key={c.id} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function CandidateProfile({ candidate }: { candidate: ApiCandidate }) {
  const initials = candidate.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <article className="border bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-sm)]">
      <div className="flex gap-4">
        {candidate.photo ? (
          <img
            src={candidate.photo}
            alt={candidate.name}
            className="h-14 w-14 shrink-0 rounded-full object-cover border"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#28758f] text-lg font-bold text-white">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl font-bold text-[hsl(var(--primary))]">{candidate.name}</h3>
          <p className="text-sm font-semibold text-[#28758f]">{candidate.party || 'Independent'}</p>
        </div>
      </div>
      {candidate.description && (
        <p className="mt-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{candidate.description}</p>
      )}
    </article>
  );
}

function VotePage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();

  const [election, setElection] = useState<ApiElection | null>(null);
  const [candidates, setCandidates] = useState<ApiCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [voteRecorded, setVoteRecorded] = useState(false);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [recordedTime, setRecordedTime] = useState<string>('');

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        setLocation('/login');
      } else if (user?.role !== 'voter') {
        setLocation('/admin/dashboard');
      }
    }
  }, [authLoading, isAuthenticated, user, setLocation]);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setPageError(null);

        const [electionRes, candidatesRes] = await Promise.all([
          getElectionById(id!),
          getCandidatesByElection(id!),
        ]);

        if (isMounted) {
          setElection(electionRes.election);
          setCandidates(candidatesRes.candidates || []);
        }

        try {
          const voteStatus = await getElectionVoteStatus(id!);
          if (voteStatus.has_voted && isMounted) {
            setAlreadyVoted(true);
          }
        } catch (err) {
          // non-fatal status check
        }
      } catch (err: any) {
        if (isMounted) {
          setPageError(err.message || 'Unable to load election or candidates.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const chosenCandidate = candidates.find((c) => c.id === selectedCandidateId);

  const handleConfirmVote = async () => {
    if (!election || !selectedCandidateId || submitting) return;

    try {
      setSubmitting(true);
      setSubmitError(null);

      // Call real backend castVote API with only election_id and candidate_id
      await castVote({
        election_id: Number(election.id),
        candidate_id: Number(selectedCandidateId),
      });

      // Vote successfully recorded on the backend
      setVoteRecorded(true);
      setRecordedTime(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
      setShowConfirmModal(false);
    } catch (err: any) {
      setShowConfirmModal(false);
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setAlreadyVoted(true);
          setSubmitError('You have already voted in this election.');
        } else if (err.status === 401) {
          logout();
          setLocation('/login');
        } else if (err.status === 403) {
          setSubmitError('You are not authorized to cast votes.');
        } else if (err.status === 404) {
          setSubmitError('The election or candidate could not be found.');
        } else if (err.status === 400) {
          setSubmitError(err.message || 'Please check your selection and try again.');
        } else if (err.status === 500) {
          setSubmitError('Something went wrong while submitting your vote. Please try again.');
        } else {
          setSubmitError(err.message || 'Failed to submit vote. Please try again.');
        }
      } else {
        setSubmitError('Unable to connect to the server. Please check your connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20 text-[hsl(var(--muted-foreground))]">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#28758f]" />
          <p className="text-sm">Loading ballot...</p>
        </div>
      </AppShell>
    );
  }

  if (pageError || !election) {
    return (
      <AppShell>
        <Link href="/voter/elections" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-[#28758f]">
          <ArrowLeft className="h-4 w-4" /> Back to elections
        </Link>
        <div className="rounded-md bg-[#fff1f0] p-8 text-center">
          <p className="font-semibold text-[#a53531]">{pageError || 'Election not found.'}</p>
          <Button variant="secondary" className="mt-4" onClick={() => setLocation('/voter/elections')}>
            Return to elections
          </Button>
        </div>
      </AppShell>
    );
  }

  // Already voted state (from backend 409)
  if (alreadyVoted) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl py-14 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#fef3eb] text-[#c05621]">
            <ShieldCheck className="h-8 w-8" />
          </span>
          <p className="label-caps mt-7 text-[#28758f]">Participation Recorded</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[hsl(var(--primary))]">
            You have already voted in this election.
          </h1>
          <p className="mx-auto mt-4 max-w-md leading-7 text-[hsl(var(--muted-foreground))]">
            Our records show that your ballot for &ldquo;{election.title}&rdquo; has already been received. Duplicate votes are strictly prevented.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/voter/elections" data-testid="link-already-voted-elections">
              <Button variant="secondary">
                Return to elections
              </Button>
            </Link>
            <Link href="/voter/confirmation" data-testid="link-already-voted-history">
              <Button>
                View voting history & receipt <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // Success State
  if (voteRecorded) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl py-14 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#e4f2eb] text-[#357a58]">
            <CheckCircle2 className="h-8 w-8" />
          </span>
          <p className="label-caps mt-7 text-[#28758f]">Ballot Submitted</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[hsl(var(--primary))]">
            Your vote has been recorded.
          </h1>
          <p className="mx-auto mt-4 max-w-md leading-7 text-[hsl(var(--muted-foreground))]">
            Your ballot for &ldquo;{election.title}&rdquo; was cast successfully at {recordedTime || 'just now'}. To protect your privacy, your candidate choice is kept strictly confidential.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/voter/elections" data-testid="link-success-elections">
              <Button variant="secondary" className="px-6">
                Return to elections
              </Button>
            </Link>
            <Link href="/voter/confirmation" data-testid="link-success-receipt">
              <Button className="px-6">
                View private receipt <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // If election is not active
  if (election.status !== 'active') {
    return (
      <AppShell>
        <Link href={`/voter/elections/${election.id}`} className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-[#28758f]">
          <ArrowLeft className="h-4 w-4" /> Back to election details
        </Link>
        <div className="mx-auto max-w-2xl py-14 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#f1f5f9] text-[#64748b]">
            <Clock3 className="h-8 w-8" />
          </span>
          <p className="label-caps mt-7 text-[#28758f]">{election.status === 'upcoming' ? 'Upcoming Election' : 'Closed Election'}</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[hsl(var(--primary))]">
            {election.status === 'upcoming' ? 'Voting has not started yet.' : 'Voting is closed.'}
          </h1>
          <p className="mx-auto mt-4 max-w-md leading-7 text-[hsl(var(--muted-foreground))]">
            {election.status === 'upcoming'
              ? `Voting for "${election.title}" will open on ${formatDate(election.start_date)}.`
              : `This election concluded on ${formatDate(election.end_date)}.`}
          </p>
          <Link href="/voter/elections" className="mt-8 inline-block">
            <Button variant="secondary">Browse other elections</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/voter/elections/${election.id}`}
          className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-[#28758f]"
          data-testid="link-back-election-detail"
        >
          <ArrowLeft className="h-4 w-4" /> Back to election
        </Link>

        <div className="mb-9">
          <p className="label-caps text-[#28758f]">Private ballot · step {step} of 2</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[hsl(var(--primary))]">
            {step === 1 ? 'Make your choice' : 'Review your ballot'}
          </h1>
          <p className="mt-3 text-[hsl(var(--muted-foreground))]">{election.title}</p>
        </div>

        {submitError && (
          <div className="mb-6 rounded-md bg-[#fff1f0] p-4 text-sm text-[#a53531]" data-testid="status-vote-error">
            {submitError}
          </div>
        )}

        {step === 1 ? (
          <>
            {candidates.length === 0 ? (
              <div className="border border-dashed p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
                <p className="font-semibold text-[hsl(var(--primary))]">No candidates registered for this election.</p>
                <p className="mt-1">Please check back later.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {candidates.map((c) => {
                  const isSelected = selectedCandidateId === c.id;
                  const initials = c.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

                  return (
                    <label
                      key={c.id}
                      className={`flex cursor-pointer items-center gap-4 border bg-[hsl(var(--card))] p-5 transition-colors ${
                        isSelected ? 'border-[#28758f] bg-[#f2fafb]' : 'hover:border-[#8bb7c2]'
                      } ${submitting ? 'pointer-events-none opacity-60' : ''}`}
                      data-testid={`card-candidate-${c.id}`}
                    >
                      <input
                        type="radio"
                        name="candidate"
                        value={c.id}
                        disabled={submitting}
                        checked={isSelected}
                        onChange={() => {
                          setSelectedCandidateId(c.id);
                          if (submitError) setSubmitError(null);
                        }}
                        className="h-5 w-5 accent-[#28758f]"
                        data-testid={`input-candidate-${c.id}`}
                      />
                      {c.photo ? (
                        <img
                          src={c.photo}
                          alt={c.name}
                          className="h-11 w-11 rounded-full object-cover border"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="grid h-11 w-11 place-items-center rounded-full bg-[#28758f] text-sm font-bold text-white">
                          {initials}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="block font-semibold text-[hsl(var(--primary))]">{c.name}</span>
                        <span className="text-sm text-[hsl(var(--muted-foreground))]">{c.party || 'Independent'}</span>
                        {c.description && (
                          <p className="mt-1 line-clamp-1 text-xs text-[hsl(var(--muted-foreground))]">
                            {c.description}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="mt-7 flex items-center justify-between border-t pt-5">
              <span className="text-sm text-[hsl(var(--muted-foreground))]">
                <ShieldCheck className="mr-1.5 inline h-4 w-4 text-[#37805b]" />
                Your choice stays private.
              </span>
              <Button
                disabled={!selectedCandidateId || submitting}
                onClick={() => setStep(2)}
                data-testid="button-review-vote"
              >
                Review ballot <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="border bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between border-b pb-5">
              <div className="flex items-center gap-4">
                {chosenCandidate?.photo ? (
                  <img
                    src={chosenCandidate.photo}
                    alt={chosenCandidate.name}
                    className="h-14 w-14 rounded-full object-cover border"
                  />
                ) : (
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-[#28758f] text-lg font-bold text-white">
                    {chosenCandidate?.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Your Selection
                  </p>
                  <p className="font-display text-2xl font-bold text-[hsl(var(--primary))]">{chosenCandidate?.name}</p>
                  <p className="text-sm text-[#28758f]">{chosenCandidate?.party || 'Independent'}</p>
                </div>
              </div>
              <CheckCircle2 className="h-7 w-7 text-[#37805b]" />
            </div>

            <p className="mt-5 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              Please review your selection before confirming. Your vote cannot be changed after submission.
            </p>

            <div className="mt-7 flex flex-wrap justify-between gap-3">
              <Button
                variant="ghost"
                disabled={submitting}
                onClick={() => setStep(1)}
                data-testid="button-edit-vote"
              >
                <ArrowLeft className="h-4 w-4" /> Change choice
              </Button>
              <Button
                disabled={submitting}
                onClick={() => setShowConfirmModal(true)}
                data-testid="button-submit-vote"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Submitting your vote...
                  </>
                ) : (
                  <>
                    Submit ballot <Check className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-[#122b45]/50 p-5">
            <div className="w-full max-w-md border bg-[hsl(var(--card))] p-7 shadow-[var(--shadow-md)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="label-caps text-[#28758f]">One last check</p>
                  <h2 className="mt-2 font-display text-2xl font-bold text-[hsl(var(--primary))]">
                    Submit this ballot?
                  </h2>
                </div>
                <button
                  disabled={submitting}
                  onClick={() => setShowConfirmModal(false)}
                  data-testid="button-close-confirmation"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="my-5 rounded-md bg-[#f4f8fa] p-4 text-sm">
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Election</p>
                <p className="font-semibold text-[hsl(var(--primary))]">{election.title}</p>
                <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">Candidate</p>
                <p className="font-semibold text-[#28758f]">
                  {chosenCandidate?.name} ({chosenCandidate?.party || 'Independent'})
                </p>
              </div>

              <p className="text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                This records your participation in {election.title}. Your selection stays private and cannot be changed after submission.
              </p>

              <div className="mt-7 flex justify-end gap-3">
                <Button
                  variant="ghost"
                  disabled={submitting}
                  onClick={() => setShowConfirmModal(false)}
                  data-testid="button-cancel-submit"
                >
                  Not yet
                </Button>
                <Button
                  disabled={submitting}
                  onClick={handleConfirmVote}
                  data-testid="button-confirm-submit"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Submitting your vote...
                    </>
                  ) : (
                    <>
                      Confirm ballot <Check className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function VoterResults() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [election, setElection] = useState<ApiElection | null>(null);
  const [results, setResults] = useState<ApiElectionResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [authLoading, isAuthenticated, setLocation]);

  const loadResults = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [resultsRes, electionRes] = await Promise.all([
        getElectionResults(id),
        getElectionById(id),
      ]);
      setResults(resultsRes);
      setElection(electionRes.election);
    } catch (err: any) {
      setError(err.message || 'Failed to load election results.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, [id]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20 text-[hsl(var(--muted-foreground))]">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#28758f]" />
          <p className="text-sm">Loading election results...</p>
        </div>
      </AppShell>
    );
  }

  if (error || !results || !election) {
    return (
      <AppShell>
        <Link href="/voter/elections" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-[#28758f]">
          <ArrowLeft className="h-4 w-4" /> Back to elections
        </Link>
        <div className="rounded-md bg-[#fff1f0] p-8 text-center">
          <p className="font-semibold text-[#a53531]">{error || 'Election results not found.'}</p>
          <div className="mt-4 flex justify-center gap-3">
            <Button variant="secondary" onClick={loadResults} data-testid="button-retry-results">
              <RotateCw className="h-4 w-4" /> Try again
            </Button>
            <Button variant="ghost" onClick={() => setLocation('/voter/elections')}>
              Return to directory
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const isEnded = election.status === 'ended';
  const isUpcoming = election.status === 'upcoming';
  const isActive = election.status === 'active';

  const chartData = (results.results || []).map((r) => ({
    name: r.candidate_name,
    votes: r.vote_count,
    party: r.party || 'Independent',
  }));

  const totalVotes = results.total_votes || 0;
  const winner = isEnded && results.results && results.results.length > 0 ? results.results[0] : null;

  return (
    <AppShell>
      <Link href={`/voter/elections/${election.id}`} className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-[#28758f]">
        <ArrowLeft className="h-4 w-4" /> Back to election details
      </Link>

      <SectionTitle
        eyebrow="Official Tally"
        title={election.title}
        description={
          isEnded
            ? 'Final certified vote statistics and candidate distributions.'
            : isActive
            ? 'Live participation in progress. Tally updates as ballots are recorded.'
            : 'This election is upcoming. Results will be published following the conclusion of voting.'
        }
        action={
          <div className="flex items-center gap-2">
            <Badge tone={isEnded ? 'neutral' : isActive ? 'active' : 'blue'}>
              {isEnded ? 'Final Certified Results' : isActive ? 'Live Tally (Active)' : 'Upcoming'}
            </Badge>
            <Button variant="secondary" onClick={loadResults} data-testid="button-refresh-results">
              <RotateCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        }
      />

      {isUpcoming ? (
        <div className="border bg-[#f8fafc] p-8 text-center">
          <Clock3 className="mx-auto h-8 w-8 text-[#64748b]" />
          <p className="mt-3 font-semibold text-[hsl(var(--primary))]">Voting has not opened yet.</p>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            Voting will open on {formatDate(election.start_date)} and conclude on {formatDate(election.end_date)}.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
            0 ballots recorded
          </div>
        </div>
      ) : (
        <>
          {isActive && (
            <div className="mb-6 flex items-start gap-4 border-l-4 border-[#28758f] bg-[#eef6f7] p-5 text-sm">
              <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-[#28758f]" />
              <div>
                <p className="font-semibold text-[hsl(var(--primary))]">Live Tally in Progress</p>
                <p className="mt-1 text-[hsl(var(--muted-foreground))]">
                  Voting closes on {formatDate(election.end_date)}. Results reflect certified aggregate ballots recorded to date.
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total ballots recorded" value={String(totalVotes)} note="Across all participating voters" icon={ClipboardCheck} />
            <StatCard label="Leading candidate" value={winner && winner.vote_count > 0 ? winner.candidate_name : '—'} note={winner && winner.vote_count > 0 ? `${winner.party || 'Independent'} (${winner.vote_count} votes)` : 'No votes cast yet'} icon={Users} tone="green" />
            <StatCard label="Candidates" value={String(results.results.length)} note="Certified on ballot" icon={Vote} />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="border bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)]">
              <h2 className="font-display text-2xl font-bold text-[hsl(var(--primary))]">Votes per candidate</h2>
              <div className="mt-6 h-72">
                {results.results.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">No candidates found on ballot.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid stroke="#e2e9ed" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                      <ChartTooltip />
                      <Bar dataKey="votes" fill="#28758f" radius={[0, 3, 3, 0]}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={['#287fa6', '#397c68', '#bd7b43', '#6c6f9d', '#9b59b6'][i % 5]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="border bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)]">
              <h2 className="font-display text-2xl font-bold text-[hsl(var(--primary))]">Share of total ballots</h2>
              <div className="mt-5 h-72">
                {totalVotes === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">No ballots recorded in this election yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} dataKey="votes" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={['#287fa6', '#397c68', '#bd7b43', '#6c6f9d', '#9b59b6'][i % 5]} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 overflow-x-auto border bg-[hsl(var(--card))] shadow-[var(--shadow-sm)]">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-[#f1f5f6] text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                <tr>
                  <th className="px-5 py-4">Candidate</th>
                  <th className="px-5 py-4">Party</th>
                  <th className="px-5 py-4 text-right">Votes</th>
                  <th className="px-5 py-4 text-right">Share (%)</th>
                </tr>
              </thead>
              <tbody>
                {results.results.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
                      No candidates available.
                    </td>
                  </tr>
                ) : (
                  results.results.map((c) => {
                    const share = totalVotes > 0 ? ((c.vote_count / totalVotes) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={c.candidate_id} className="border-t">
                        <td className="px-5 py-4 font-semibold text-[hsl(var(--primary))]">{c.candidate_name}</td>
                        <td className="px-5 py-4 text-[hsl(var(--muted-foreground))]">{c.party || 'Independent'}</td>
                        <td className="px-5 py-4 text-right font-mono font-bold text-[hsl(var(--primary))]">{c.vote_count}</td>
                        <td className="px-5 py-4 text-right font-semibold text-[#28758f]">{share}%</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  );
}

function Confirmation() {
  const { user } = useAuth();
  const [history, setHistory] = useState<VoteHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getVoteHistory();
      setHistory(res.history || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load voting history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <SectionTitle
          eyebrow="Private receipt"
          title="Your participation & history."
          description="A complete record of your participation receipts. In accordance with secret-ballot principles, candidate choices are never stored with your account."
          action={
            <Button variant="secondary" onClick={loadHistory} data-testid="button-refresh-history">
              <RotateCw className="h-4 w-4" /> Refresh
            </Button>
          }
        />

        <div className="border bg-[hsl(var(--card))] p-7 shadow-[var(--shadow-sm)]">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Voter account</p>
              <p className="mt-1 font-semibold text-[hsl(var(--primary))]" data-testid="text-voter-name">{user?.name || 'Registered Voter'}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{user?.email}</p>
            </div>
            <Badge tone="success">Verified Voter</Badge>
          </div>
          <div className="mt-7 grid gap-4 border-t pt-5 sm:grid-cols-2">
            <div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Participation Status</p>
              <p className="mt-1 font-semibold">Ballot verified & recorded</p>
            </div>
            <div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Privacy Status</p>
              <p className="mt-1 font-semibold">Candidate choice encrypted & confidential</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 border-l-4 border-[#37805b] bg-[#eef7f1] p-5 text-sm leading-6 text-[#2f6348]">
          <ShieldCheck className="mt-1 h-5 w-5 shrink-0" />
          <p>
            <strong>Your vote remains completely private.</strong> VoteSecure only tracks eligibility and participation to prevent duplicate voting. Your individual candidate choice is never linked to your account.
          </p>
        </div>

        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-[hsl(var(--primary))]">Voting History</h2>
            <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">
              {history.length} {history.length === 1 ? 'ballot' : 'ballots'} recorded
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-[hsl(var(--muted-foreground))]">
              <Loader2 className="mb-3 h-7 w-7 animate-spin text-[#28758f]" />
              <p className="text-sm">Loading voting history...</p>
            </div>
          ) : error ? (
            <div className="rounded-md bg-[#fff1f0] p-6 text-center">
              <p className="text-sm text-[#a53531]">{error}</p>
              <Button variant="secondary" className="mt-3" onClick={loadHistory}>
                Retry
              </Button>
            </div>
          ) : history.length === 0 ? (
            <div className="border border-dashed p-10 text-center">
              <ClipboardCheck className="mx-auto h-8 w-8 text-[#94a3b8]" />
              <p className="mt-3 font-semibold text-[hsl(var(--primary))]">No voting history yet</p>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                When you cast a ballot in an active election, your private receipt reference will be recorded here.
              </p>
              <Link href="/voter/elections" className="mt-5 inline-block">
                <Button>
                  Explore open elections <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto border bg-[hsl(var(--card))] shadow-[var(--shadow-sm)]">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-[#f1f5f6] text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  <tr>
                    <th className="px-5 py-4">Election</th>
                    <th className="px-5 py-4">Date & Time</th>
                    <th className="px-5 py-4">Receipt Reference</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr className="border-t" key={item.id}>
                      <td className="px-5 py-4 font-semibold text-[hsl(var(--primary))]">
                        {item.election_title}
                      </td>
                      <td className="px-5 py-4 text-[hsl(var(--muted-foreground))]">
                        {formatDate(item.voted_at)}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs font-semibold text-[#28758f]">
                        {item.receipt_code}
                      </td>
                      <td className="px-5 py-4">
                        <Badge tone="success">{item.status}</Badge>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link href={`/voter/elections/${item.election_id}`}>
                          <Button variant="ghost" className="px-3 py-1.5 text-xs">
                            View election
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-between">
          <Link href="/voter/elections" data-testid="link-confirmation-directory">
            <Button>
              Browse elections <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [electionSummaries, setElectionSummaries] = useState<AdminElectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) setLocation('/admin/login');
      else if (user?.role !== 'admin') setLocation('/voter/dashboard');
    }
  }, [authLoading, isAuthenticated, user, setLocation]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminStats();
      setStats(res.stats);
      setElectionSummaries(res.elections || []);
    } catch (err: any) {
      setError(err.message || 'Unable to load admin statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      loadData();
    }
  }, [isAuthenticated, user]);

  if (loading) {
    return (
      <AppShell admin>
        <div className="flex flex-col items-center justify-center py-20 text-[hsl(var(--muted-foreground))]">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#28758f]" />
          <p className="text-sm">Loading admin dashboard...</p>
        </div>
      </AppShell>
    );
  }

  if (error || !stats) {
    return (
      <AppShell admin>
        <div className="rounded-md bg-[#fff1f0] p-8 text-center">
          <p className="font-semibold text-[#a53531]">{error || 'Failed to load dashboard.'}</p>
          <Button variant="secondary" className="mt-4" onClick={loadData}>
            Retry
          </Button>
        </div>
      </AppShell>
    );
  }

  const chartData = electionSummaries.map((e) => ({
    name: e.title.length > 18 ? e.title.slice(0, 18) + '...' : e.title,
    votes: e.votes,
  }));

  return (
    <AppShell admin>
      <SectionTitle
        eyebrow="Administration"
        title="Stewardship dashboard."
        description="A live view of the health, eligibility, and participation across your elections."
        action={
          <Link href="/admin/elections/create" data-testid="button-dashboard-create-election">
            <Button>
              <Plus className="h-4 w-4" /> Create election
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registered voters" value={String(stats.registeredVoters)} note="Active voter accounts" icon={Users} />
        <StatCard
          label="Active elections"
          value={String(stats.activeElections).padStart(2, '0')}
          note={`${stats.upcomingElections} upcoming, ${stats.endedElections} ended`}
          icon={Vote}
          tone={stats.activeElections > 0 ? 'green' : 'neutral'}
        />
        <StatCard label="Total candidates" value={String(stats.totalCandidates)} note="Registered across elections" icon={ClipboardCheck} />
        <StatCard label="Ballots recorded" value={String(stats.totalVotes)} note="Across all elections" icon={TrendingUp} tone="green" />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_.5fr]">
        <div className="border bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)]">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="label-caps text-[#28758f]">Participation</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-[hsl(var(--primary))]">Ballots per election</h2>
            </div>
            <Badge tone="success">Live database</Badge>
          </div>
          <div className="h-64">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">No elections found.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid stroke="#e2e9ed" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <ChartTooltip />
                  <Bar dataKey="votes" fill="#28758f" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="border bg-[hsl(var(--primary))] p-6 text-white shadow-[var(--shadow-sm)]">
          <p className="label-caps text-[#a8cfdb]">Elections Overview</p>
          <div className="mt-7 space-y-4">
            <div className="flex justify-between border-b border-white/20 pb-3">
              <span className="text-sm text-[#c6dae3]">Total Elections</span>
              <span className="font-bold">{stats.totalElections}</span>
            </div>
            <div className="flex justify-between border-b border-white/20 pb-3">
              <span className="text-sm text-[#c6dae3]">Active Elections</span>
              <span className="font-bold text-[#74b49a]">{stats.activeElections}</span>
            </div>
            <div className="flex justify-between border-b border-white/20 pb-3">
              <span className="text-sm text-[#c6dae3]">Upcoming Elections</span>
              <span className="font-bold text-[#a8cfdb]">{stats.upcomingElections}</span>
            </div>
            <div className="flex justify-between border-b border-white/20 pb-3">
              <span className="text-sm text-[#c6dae3]">Ended Elections</span>
              <span className="font-bold text-[#e2e8f0]">{stats.endedElections}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-sm text-[#c6dae3]">Total Votes Cast</span>
              <span className="font-bold text-[#74b49a]">{stats.totalVotes}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 border bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-[hsl(var(--primary))]">Election Registry Summary</h2>
          <Link href="/admin/elections" className="text-sm font-semibold text-[#28758f]" data-testid="link-admin-elections-summary">
            Manage all elections →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f1f5f6] text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3 text-right">Votes</th>
              </tr>
            </thead>
            <tbody>
              {electionSummaries.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="px-4 py-3 font-semibold text-[hsl(var(--primary))]">{e.title}</td>
                  <td className="px-4 py-3">
                    <Badge tone={e.status === 'active' ? 'active' : e.status === 'ended' ? 'neutral' : 'blue'}>{e.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))]">
                    {formatDate(e.start_date)} — {formatDate(e.end_date)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[hsl(var(--primary))]">{e.votes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function AdminElections() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [elections, setElections] = useState<ApiElection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) setLocation('/admin/login');
      else if (user?.role !== 'admin') setLocation('/voter/dashboard');
    }
  }, [authLoading, isAuthenticated, user, setLocation]);

  const loadElections = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getElections();
      setElections(res.elections || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load elections.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      loadElections();
    }
  }, [isAuthenticated, user]);

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      setDeleting(true);
      await deleteElection(confirmDeleteId);
      setConfirmDeleteId(null);
      await loadElections();
    } catch (err: any) {
      alert(err.message || 'Failed to delete election.');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = elections.filter((e) => {
    const matchesQuery = e.title.toLowerCase().includes(query.toLowerCase()) || (e.description || '').toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <AppShell admin>
      <SectionTitle
        eyebrow="Manage elections"
        title="Election registry."
        description="Create, review, and maintain the election calendar."
        action={
          <Link href="/admin/elections/create" data-testid="button-create-election">
            <Button>
              <Plus className="h-4 w-4" /> Create election
            </Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by election name..."
            className="h-10 w-full rounded-md border bg-[hsl(var(--card))] pl-9 pr-3 text-sm"
            data-testid="input-admin-election-search"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border bg-[hsl(var(--card))] px-3 text-sm"
          data-testid="select-admin-election-status"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="upcoming">Upcoming</option>
          <option value="ended">Ended</option>
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[hsl(var(--muted-foreground))]">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#28758f]" />
          <p className="text-sm">Loading elections...</p>
        </div>
      ) : error ? (
        <div className="rounded-md bg-[#fff1f0] p-6 text-center">
          <p className="text-sm text-[#a53531]">{error}</p>
          <Button variant="secondary" className="mt-3" onClick={loadElections}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto border bg-[hsl(var(--card))] shadow-[var(--shadow-sm)]">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-[#f1f5f6] text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              <tr>
                <th className="px-5 py-4">Election</th>
                <th className="px-5 py-4">Schedule Window</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
                    No elections match your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr className="border-t" key={e.id}>
                    <td className="px-5 py-5">
                      <p className="font-semibold text-[hsl(var(--primary))]">{e.title}</p>
                      {e.description && <p className="mt-1 line-clamp-1 text-xs text-[hsl(var(--muted-foreground))]">{e.description}</p>}
                    </td>
                    <td className="px-5 py-5 text-[hsl(var(--muted-foreground))]">
                      {formatDate(e.start_date)}
                      <br />
                      {formatDate(e.end_date)}
                    </td>
                    <td className="px-5 py-5">
                      <Badge tone={e.status === 'active' ? 'active' : e.status === 'ended' ? 'neutral' : 'blue'}>{e.status}</Badge>
                    </td>
                    <td className="px-5 py-5">
                      <div className="flex justify-end gap-1">
                        <Link href={`/voter/elections/${e.id}`} data-testid={`link-admin-view-${e.id}`}>
                          <Button variant="ghost" className="px-2" aria-label="View election">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/admin/elections/create?edit=${e.id}`} data-testid={`link-admin-edit-${e.id}`}>
                          <Button variant="ghost" className="px-2" aria-label="Edit election">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          className="px-2 text-[#a53531]"
                          onClick={() => setConfirmDeleteId(e.id)}
                          aria-label="Delete election"
                          data-testid={`button-delete-election-${e.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {confirmDeleteId !== null && (
        <Confirm
          title="Delete this election?"
          text="This will permanently delete the election and its candidate references. This action cannot be undone."
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={handleDelete}
        />
      )}
    </AppShell>
  );
}

function Confirm({ title, text, onCancel, onConfirm }: { title: string; text: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#122b45]/50 p-5">
      <div className="w-full max-w-md border bg-[hsl(var(--card))] p-7 shadow-[var(--shadow-md)]">
        <p className="label-caps text-[#a53531]">Destructive action</p>
        <h2 className="mt-2 font-display text-2xl font-bold text-[hsl(var(--primary))]">{title}</h2>
        <p className="mt-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{text}</p>
        <div className="mt-7 flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel} data-testid="button-cancel-delete">
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} data-testid="button-confirm-delete">
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

function ElectionForm() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const editId = params.get('edit');

  const [form, setForm] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'upcoming' as ApiElection['status'],
  });
  const [loadingInitial, setLoadingInitial] = useState(!!editId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) setLocation('/admin/login');
      else if (user?.role !== 'admin') setLocation('/voter/dashboard');
    }
  }, [authLoading, isAuthenticated, user, setLocation]);

  useEffect(() => {
    if (!editId) return;
    let isMounted = true;

    async function fetchExisting() {
      try {
        setLoadingInitial(true);
        const res = await getElectionById(editId!);
        if (isMounted && res.election) {
          setForm({
            title: res.election.title,
            description: res.election.description || '',
            startDate: res.election.start_date.slice(0, 10),
            endDate: res.election.end_date.slice(0, 10),
            status: res.election.status,
          });
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load existing election.');
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    }

    fetchExisting();
    return () => {
      isMounted = false;
    };
  }, [editId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.startDate || !form.endDate) {
      setError('Please provide a title, start date, and end date.');
      return;
    }
    if (form.startDate >= form.endDate) {
      setError('Start date must be before the end date.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      if (editId) {
        await updateElection(editId, {
          title: form.title.trim(),
          description: form.description.trim() || null,
          start_date: form.startDate,
          end_date: form.endDate,
          status: form.status,
        });
      } else {
        await createElection({
          title: form.title.trim(),
          description: form.description.trim() || null,
          start_date: form.startDate,
          end_date: form.endDate,
          status: form.status,
        });
      }
      setLocation('/admin/elections');
    } catch (err: any) {
      setError(err.message || 'Failed to save election.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <AppShell admin>
        <div className="flex flex-col items-center justify-center py-20 text-[hsl(var(--muted-foreground))]">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#28758f]" />
          <p className="text-sm">Loading election details...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell admin>
      <Link href="/admin/elections" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-[#28758f]" data-testid="link-back-admin-elections">
        <ArrowLeft className="h-4 w-4" /> Back to elections
      </Link>
      <SectionTitle
        eyebrow={editId ? 'Edit election' : 'New election'}
        title={editId ? 'Update election details' : 'Create an election'}
        description="Configure the election title, timeline, and voting window."
      />
      <form onSubmit={submit} className="max-w-3xl border bg-[hsl(var(--card))] p-6 sm:p-8 shadow-[var(--shadow-sm)]">
        <div className="grid gap-5">
          <label className="grid gap-2 text-sm font-semibold">
            Election title
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="h-12 rounded-md border px-3 font-normal"
              placeholder="e.g. Student Council Election 2026"
              required
              data-testid="input-election-title"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Description
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="min-h-28 rounded-md border p-3 font-normal"
              placeholder="Provide context and candidate information for voters..."
              data-testid="input-election-description"
            />
          </label>
          <div className="grid gap-5 sm:grid-cols-3">
            <label className="grid gap-2 text-sm font-semibold">
              Starts
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="h-11 rounded-md border px-3 font-normal"
                required
                data-testid="input-election-start"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Ends
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="h-11 rounded-md border px-3 font-normal"
                required
                data-testid="input-election-end"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Status
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ApiElection['status'] })}
                className="h-11 rounded-md border px-3 font-normal"
                data-testid="select-election-status"
              >
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="ended">Ended</option>
              </select>
            </label>
          </div>
          {error && (
            <p className="text-sm text-[#a53531]" data-testid="status-election-error">
              {error}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-3 border-t pt-5">
            <Link href="/admin/elections" data-testid="link-cancel-election">
              <Button variant="ghost" disabled={submitting}>
                Cancel
              </Button>
            </Link>
            <Button disabled={submitting} data-testid="button-save-election">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {editId ? 'Update election' : 'Save election'}
            </Button>
          </div>
        </div>
      </form>
    </AppShell>
  );
}

function AdminCandidates() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [candidates, setCandidates] = useState<ApiCandidate[]>([]);
  const [elections, setElections] = useState<ApiElection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<ApiCandidate | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [selectedElectionFilter, setSelectedElectionFilter] = useState<string>('all');

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) setLocation('/admin/login');
      else if (user?.role !== 'admin') setLocation('/voter/dashboard');
    }
  }, [authLoading, isAuthenticated, user, setLocation]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [candRes, elecRes] = await Promise.all([getCandidates(), getElections()]);
      setCandidates(candRes.candidates || []);
      setElections(elecRes.elections || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load candidates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      loadData();
    }
  }, [isAuthenticated, user]);

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteCandidate(confirmDeleteId);
      setConfirmDeleteId(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete candidate.');
    }
  };

  const list = candidates.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.party || '').toLowerCase().includes(search.toLowerCase());
    const matchesElection = selectedElectionFilter === 'all' || String(c.election_id) === selectedElectionFilter;
    return matchesSearch && matchesElection;
  });

  return (
    <AppShell admin>
      <SectionTitle
        eyebrow="Candidate registry"
        title="Candidates."
        description="Maintain the candidate profiles and manifestos displayed on public ballots."
        action={
          <Button onClick={() => setAdding(true)} data-testid="button-add-candidate">
            <Plus className="h-4 w-4" /> Add candidate
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded border bg-[hsl(var(--card))] pl-9 text-sm"
            placeholder="Search candidates by name or party..."
            data-testid="input-candidate-search"
          />
        </div>
        <select
          value={selectedElectionFilter}
          onChange={(e) => setSelectedElectionFilter(e.target.value)}
          className="h-10 rounded border bg-[hsl(var(--card))] px-3 text-sm"
          data-testid="select-candidate-election-filter"
        >
          <option value="all">All elections</option>
          {elections.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[hsl(var(--muted-foreground))]">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#28758f]" />
          <p className="text-sm">Loading candidates...</p>
        </div>
      ) : error ? (
        <div className="rounded-md bg-[#fff1f0] p-6 text-center">
          <p className="text-sm text-[#a53531]">{error}</p>
          <Button variant="secondary" className="mt-3" onClick={loadData}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {list.length === 0 ? (
            <div className="border border-dashed p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
              No candidates found matching your filter criteria.
            </div>
          ) : (
            list.map((c) => {
              const initials = c.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
              const electionTitle = elections.find((e) => e.id === c.election_id)?.title || `Election #${c.election_id}`;

              return (
                <div key={c.id} className="flex flex-col gap-4 border bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center">
                  {c.photo ? (
                    <img src={c.photo} alt={c.name} className="h-12 w-12 shrink-0 rounded-full object-cover border" />
                  ) : (
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#28758f] text-sm font-bold text-white">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[hsl(var(--primary))]">{c.name}</p>
                    <p className="text-sm text-[#28758f]">
                      {c.party || 'Independent'} <span className="text-[hsl(var(--muted-foreground))]">· {electionTitle}</span>
                    </p>
                    {c.description && <p className="mt-1 truncate text-sm text-[hsl(var(--muted-foreground))]">{c.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" onClick={() => setEditing(c)} data-testid={`button-edit-candidate-${c.id}`}>
                      <Edit3 className="h-4 w-4" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-[#a53531]"
                      onClick={() => setConfirmDeleteId(c.id)}
                      data-testid={`button-delete-candidate-${c.id}`}
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {(adding || editing) && (
        <CandidateModal
          initial={editing}
          elections={elections}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSaved={loadData}
        />
      )}

      {confirmDeleteId !== null && (
        <Confirm
          title="Delete this candidate?"
          text="The candidate profile will be removed from the ballot and candidate registry."
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={handleDelete}
        />
      )}
    </AppShell>
  );
}

function CandidateModal({
  initial,
  elections,
  onClose,
  onSaved,
}: {
  initial: ApiCandidate | null;
  elections: ApiElection[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [party, setParty] = useState(initial?.party || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [electionId, setElectionId] = useState<number>(initial?.election_id || (elections[0]?.id ? Number(elections[0].id) : 0));
  const [photo, setPhoto] = useState(initial?.photo || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Candidate name is required.');
      return;
    }
    if (!electionId) {
      setError('Please select an election for this candidate.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      if (initial) {
        await updateCandidate(initial.id, {
          name: name.trim(),
          party: party.trim() || null,
          description: description.trim() || null,
          election_id: Number(electionId),
          photo: photo.trim() || null,
        });
      } else {
        await createCandidate({
          name: name.trim(),
          party: party.trim() || null,
          description: description.trim() || null,
          election_id: Number(electionId),
          photo: photo.trim() || null,
        });
      }
      await onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save candidate.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#122b45]/50 p-5">
      <div className="max-h-[90dvh] w-full max-w-lg overflow-auto border bg-[hsl(var(--card))] p-7 shadow-[var(--shadow-md)]">
        <div className="flex items-start justify-between">
          <div>
            <p className="label-caps text-[#28758f]">Candidate profile</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-[hsl(var(--primary))]">
              {initial ? 'Edit candidate' : 'Add candidate'}
            </h2>
          </div>
          <button onClick={onClose} data-testid="button-close-candidate">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded border px-3 font-normal"
              placeholder="Full candidate name"
              required
              data-testid="input-candidate-name"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Election
            <select
              value={electionId}
              onChange={(e) => setElectionId(Number(e.target.value))}
              className="h-11 rounded border px-3 font-normal"
              data-testid="select-candidate-election"
            >
              {elections.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Affiliation / Party
            <input
              value={party}
              onChange={(e) => setParty(e.target.value)}
              className="h-11 rounded border px-3 font-normal"
              placeholder="e.g. Independent, Tech Forward Party"
              data-testid="input-candidate-party"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Profile photo URL
            <input
              value={photo}
              onChange={(e) => setPhoto(e.target.value)}
              className="h-11 rounded border px-3 font-normal"
              placeholder="https://images.unsplash.com/..."
              data-testid="input-candidate-photo"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Short profile / Manifesto
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-24 rounded border p-3 font-normal"
              placeholder="Brief biography and policy priorities..."
              data-testid="input-candidate-description"
            />
          </label>
        </div>

        {error && <p className="mt-4 text-sm text-[#a53531]">{error}</p>}

        <div className="mt-7 flex justify-end gap-3 border-t pt-5">
          <Button variant="ghost" onClick={onClose} disabled={submitting} data-testid="button-cancel-candidate">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={submitting} data-testid="button-save-candidate">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save profile
          </Button>
        </div>
      </div>
    </div>
  );
}

function AdminVoters() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [voters, setVoters] = useState<AdminVoterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) setLocation('/admin/login');
      else if (user?.role !== 'admin') setLocation('/voter/dashboard');
    }
  }, [authLoading, isAuthenticated, user, setLocation]);

  const loadVoters = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminVoters();
      setVoters(res.voters || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load voter registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      loadVoters();
    }
  }, [isAuthenticated, user]);

  const list = voters.filter((v) => {
    const matchesStatus = status === 'all' || (status === 'voted' ? v.hasVoted : !v.hasVoted);
    const matchesQuery = (v.name + v.email + (v.mobile || '')).toLowerCase().includes(q.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  return (
    <AppShell admin>
      <SectionTitle
        eyebrow="Voter register"
        title="Voters."
        description="Monitor voter eligibility and participation status without exposing ballot choices."
      />

      <div className="mb-5 flex max-w-2xl gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-10 w-full rounded border bg-[hsl(var(--card))] pl-9 text-sm"
            placeholder="Search by name or email..."
            data-testid="input-voter-search"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded border bg-[hsl(var(--card))] px-3 text-sm"
          data-testid="select-voter-status"
        >
          <option value="all">All voters</option>
          <option value="voted">Participated</option>
          <option value="pending">Not voted</option>
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[hsl(var(--muted-foreground))]">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#28758f]" />
          <p className="text-sm">Loading voter registry...</p>
        </div>
      ) : error ? (
        <div className="rounded-md bg-[#fff1f0] p-6 text-center">
          <p className="text-sm text-[#a53531]">{error}</p>
          <Button variant="secondary" className="mt-3" onClick={loadVoters}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto border bg-[hsl(var(--card))] shadow-[var(--shadow-sm)]">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-[#f1f5f6] text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              <tr>
                <th className="px-5 py-4">Voter</th>
                <th className="px-5 py-4">Mobile</th>
                <th className="px-5 py-4">Registered</th>
                <th className="px-5 py-4">Participation</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
                    No voters found.
                  </td>
                </tr>
              ) : (
                list.map((v) => (
                  <tr className="border-t" key={v.id}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[hsl(var(--primary))]">{v.name}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{v.email}</p>
                    </td>
                    <td className="px-5 py-4 text-[hsl(var(--muted-foreground))]">{v.mobile}</td>
                    <td className="px-5 py-4 text-[hsl(var(--muted-foreground))]">{v.registrationDate}</td>
                    <td className="px-5 py-4">
                      <Badge tone={v.hasVoted ? 'success' : 'neutral'}>{v.hasVoted ? 'Voted' : 'Not voted'}</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
        <ShieldCheck className="h-4 w-4 text-[#37805b]" /> Candidate choices are strictly isolated and never stored in this registry.
      </p>
    </AppShell>
  );
}

function AdminResults() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [elections, setElections] = useState<ApiElection[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [results, setResults] = useState<ApiElectionResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) setLocation('/admin/login');
      else if (user?.role !== 'admin') setLocation('/voter/dashboard');
    }
  }, [authLoading, isAuthenticated, user, setLocation]);

  useEffect(() => {
    async function loadElections() {
      try {
        setLoading(true);
        const res = await getElections();
        setElections(res.elections || []);
        if (res.elections && res.elections.length > 0) {
          setSelectedId(Number(res.elections[0].id));
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load elections.');
      } finally {
        setLoading(false);
      }
    }

    if (isAuthenticated && user?.role === 'admin') {
      loadElections();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!selectedId) return;

    async function loadResults() {
      try {
        setError(null);
        const res = await getElectionResults(selectedId!);
        setResults(res);
      } catch (err: any) {
        setError(err.message || 'Failed to load results.');
      }
    }

    loadResults();
  }, [selectedId]);

  const selectedElection = elections.find((e) => Number(e.id) === selectedId);

  const data = (results?.results || []).map((r) => ({
    name: r.candidate_name,
    votes: r.vote_count,
    party: r.party || 'Independent',
    candidateId: r.candidate_id,
  }));

  const totalVotes = results?.total_votes || 0;

  return (
    <AppShell admin>
      <SectionTitle
        eyebrow="Results & reporting"
        title="Results."
        description="Monitor participation and audit certified vote tallies."
        action={
          elections.length > 0 ? (
            <select
              value={selectedId || ''}
              onChange={(e) => setSelectedId(Number(e.target.value))}
              className="h-11 rounded border bg-[hsl(var(--card))] px-3 text-sm font-semibold"
              data-testid="select-results-election"
            >
              {elections.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} ({e.status})
                </option>
              ))}
            </select>
          ) : null
        }
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[hsl(var(--muted-foreground))]">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#28758f]" />
          <p className="text-sm">Loading election results...</p>
        </div>
      ) : error ? (
        <div className="rounded-md bg-[#fff1f0] p-6 text-center">
          <p className="text-sm text-[#a53531]">{error}</p>
        </div>
      ) : !selectedElection ? (
        <div className="border border-dashed p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
          No elections registered in the database yet.
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard label="Ballots recorded" value={String(totalVotes)} note={`Status: ${selectedElection.status}`} icon={ClipboardCheck} />
            <StatCard
              label="Election window"
              value={formatDate(selectedElection.end_date)}
              note={`Started: ${formatDate(selectedElection.start_date)}`}
              icon={CalendarDays}
              tone="green"
            />
            <StatCard label="Candidates" value={String(data.length)} note="Registered on ballot" icon={Users} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="border bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)]">
              <h2 className="font-display text-2xl font-bold text-[hsl(var(--primary))]">Votes tally</h2>
              <div className="mt-6 h-72">
                {data.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">No candidates found.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid stroke="#e2e9ed" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                      <ChartTooltip />
                      <Bar dataKey="votes" fill="#28758f" radius={[0, 3, 3, 0]}>
                        {data.map((d, i) => (
                          <Cell key={d.candidateId} fill={['#287fa6', '#397c68', '#bd7b43', '#6c6f9d', '#9b59b6'][i % 5]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="border bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)]">
              <h2 className="font-display text-2xl font-bold text-[hsl(var(--primary))]">Share of ballots</h2>
              <div className="mt-5 h-72">
                {totalVotes === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">No ballots recorded in this election.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data} dataKey="votes" nameKey="name" innerRadius={65} outerRadius={100} paddingAngle={3}>
                        {data.map((d, i) => (
                          <Cell key={d.candidateId} fill={['#287fa6', '#397c68', '#bd7b43', '#6c6f9d', '#9b59b6'][i % 5]} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 overflow-x-auto border bg-[hsl(var(--card))] shadow-[var(--shadow-sm)]">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-[#f1f5f6] text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                <tr>
                  <th className="px-5 py-4">Candidate</th>
                  <th className="px-5 py-4">Party</th>
                  <th className="px-5 py-4 text-right">Votes</th>
                  <th className="px-5 py-4 text-right">Share (%)</th>
                </tr>
              </thead>
              <tbody>
                {data.map((c) => {
                  const share = totalVotes > 0 ? ((c.votes / totalVotes) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={c.candidateId} className="border-t">
                      <td className="px-5 py-4 font-semibold text-[hsl(var(--primary))]">{c.name}</td>
                      <td className="px-5 py-4 text-[hsl(var(--muted-foreground))]">{c.party}</td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-[hsl(var(--primary))]">{c.votes}</td>
                      <td className="px-5 py-4 text-right font-semibold text-[#28758f]">{share}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  );
}

function NotFound() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-2xl px-5 py-28 text-center">
        <p className="label-caps text-[#28758f]">Page not found</p>
        <h1 className="mt-3 font-display text-5xl font-bold text-[hsl(var(--primary))]">That path is not on the ballot.</h1>
        <p className="mt-4 text-[hsl(var(--muted-foreground))]">The page may have moved, or the address may be incomplete.</p>
        <Link href="/" data-testid="link-notfound-home">
          <Button className="mt-8">Return home</Button>
        </Link>
      </div>
    </PublicLayout>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function ProtectedVoterRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        setLocation('/login');
      } else if (user?.role !== 'voter') {
        setLocation('/admin/dashboard');
      }
    }
  }, [loading, isAuthenticated, user, setLocation]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#28758f]" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'voter') {
    return null;
  }

  return <Component />;
}

function ProtectedAdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        setLocation('/admin/login');
      } else if (user?.role !== 'admin') {
        setLocation('/voter/dashboard');
      }
    }
  }, [loading, isAuthenticated, user, setLocation]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#28758f]" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  return <Component />;
}

function PublicAuthRoute({ admin = false }: { admin?: boolean }) {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      if (user.role === 'admin') {
        setLocation('/admin/dashboard');
      } else {
        setLocation('/voter/dashboard');
      }
    }
  }, [loading, isAuthenticated, user, setLocation]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#28758f]" />
      </div>
    );
  }

  return <Login admin={admin} />;
}

function PublicRegisterRoute() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      if (user.role === 'admin') {
        setLocation('/admin/dashboard');
      } else {
        setLocation('/voter/dashboard');
      }
    }
  }, [loading, isAuthenticated, user, setLocation]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#28758f]" />
      </div>
    );
  }

  return <Register />;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login">
          <PublicAuthRoute />
        </Route>
        <Route path="/register">
          <PublicRegisterRoute />
        </Route>
        <Route path="/admin/login">
          <PublicAuthRoute admin />
        </Route>

        {/* Voter-only protected routes */}
        <Route path="/voter/dashboard">
          <ProtectedVoterRoute component={VoterDashboard} />
        </Route>
        <Route path="/voter/elections">
          <ProtectedVoterRoute component={ElectionDirectory} />
        </Route>
        <Route path="/voter/elections/:id/results">
          <ProtectedVoterRoute component={VoterResults} />
        </Route>
        <Route path="/voter/elections/:id">
          <ProtectedVoterRoute component={ElectionDetails} />
        </Route>
        <Route path="/voter/vote/:id">
          <ProtectedVoterRoute component={VotePage} />
        </Route>
        <Route path="/voter/confirmation">
          <ProtectedVoterRoute component={Confirmation} />
        </Route>

        {/* Admin-only protected routes */}
        <Route path="/admin/dashboard">
          <ProtectedAdminRoute component={AdminDashboard} />
        </Route>
        <Route path="/admin/elections">
          <ProtectedAdminRoute component={AdminElections} />
        </Route>
        <Route path="/admin/elections/create">
          <ProtectedAdminRoute component={ElectionForm} />
        </Route>
        <Route path="/admin/candidates">
          <ProtectedAdminRoute component={AdminCandidates} />
        </Route>
        <Route path="/admin/voters">
          <ProtectedAdminRoute component={AdminVoters} />
        </Route>
        <Route path="/admin/results">
          <ProtectedAdminRoute component={AdminResults} />
        </Route>

        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;