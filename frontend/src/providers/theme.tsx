import { t as tr } from "@/i18n";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
const ThemeContext = createContext<{ dark: boolean; toggle: () => void }>({
  dark: false,
  toggle: () => {},
});
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem("balance-theme");
      return saved ? saved === "dark" : false;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    try {
      localStorage.setItem("balance-theme", dark ? "dark" : "light");
    } catch {
      /* Private browsing may deny storage. */
    }
  }, [dark]);
  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark(!dark) }}>
      {children}
    </ThemeContext.Provider>
  );
}
export function ThemeToggle() {
  const { dark, toggle } = useContext(ThemeContext);
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={dark ? tr("Включить светлую тему") : tr("Включить тёмную тему")}
    >
      {dark ? <Sun size={19} /> : <Moon size={19} />}
    </Button>
  );
}
