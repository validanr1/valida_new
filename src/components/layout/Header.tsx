import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSession } from "@/integrations/supabase/SupabaseProvider";
import { signOut } from "@/services/auth"; // Corrected: import signOut instead of logout
import { LogOut, UserCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const { session, loading } = useSession();

  return (
    <header className="flex justify-between items-center p-4 border-b">
      <Link to="/" className="text-2xl font-bold">MyApp</Link>
      <nav>
        {loading ? (
          <div className="h-8 w-24 animate-pulse bg-gray-200 rounded"></div>
        ) : session ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <UserCircle className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{session.user?.email}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session.user?.user_metadata?.first_name} {session.user?.user_metadata?.last_name}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}> {/* Corrected: call signOut() */}
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild>
            <Link to="/login">Login</Link>
          </Button>
        )}
      </nav>
    </header>
  );
};

export default Header;