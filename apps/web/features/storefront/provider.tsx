"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  CheckoutContact,
  CustomerProfileContact,
  FulfillmentMethod,
} from "@dsu/contracts";
import { useNotification } from "@/components/notification-provider";
import {
  ApiError,
  request,
  type AuthResult,
  type BasketLine,
  type CustomerUser,
  type ShopOrder,
  type ShopProduct,
  type ShopState,
  type StoreSettings,
} from "./service";
interface ShopContext {
  state: ShopState;
  user: CustomerUser | null;
  settings: StoreSettings | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  authenticate: (
    email: string,
    password: string,
    name?: string,
  ) => Promise<CustomerUser>;
  logout: () => Promise<void>;
  add: (id: string, quantity: number) => Promise<void>;
  update: (id: string, quantity: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
  checkout: (
    contact: CheckoutContact,
    fulfillmentMethod: FulfillmentMethod,
    key: string,
  ) => Promise<ShopOrder>;
  cancel: (id: string, reason: string) => Promise<void>;
  saveProfile: (contact: CustomerProfileContact) => Promise<void>;
  adminRequest: <T>(
    path: string,
    body?: unknown,
    method?: string,
  ) => Promise<T>;
}
const Context = createContext<ShopContext | null>(null);
const emptyState: ShopState = { products: [], cart: [], orders: [] };
/** Server data survives reloads. No mock fallback or browser-owned session. */
export function CustomerProvider({ children }: { children: ReactNode }) {
  const { notify } = useNotification();
  const [state, setState] = useState<ShopState>(emptyState);
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const csrf = useRef<string | null>(null);
  const generation = useRef(0);
  const hasSnapshot = useRef(false);
  const lastRefreshError = useRef("");
  const invalidateReads = useCallback(() => {
    generation.current++;
  }, []);
  const adminRequest = useCallback(
    <T,>(path: string, body?: unknown, method = "GET") =>
      request<T>(path, body, method, csrf.current),
    [],
  );
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    try {
      const [auth, products, store] = await Promise.all([
        request<AuthResult>("/auth/session"),
        request<ShopProduct[]>("/catalog"),
        request<StoreSettings>("/settings"),
      ]);
      const [cart, orders] =
        auth.user?.role === "PELANGGAN"
          ? await Promise.all([
              request<BasketLine[]>("/customer/cart"),
              request<ShopOrder[]>("/customer/orders"),
            ])
          : [[], []];
      if (generation.current !== current) return;
      hasSnapshot.current = true;
      lastRefreshError.current = "";
      csrf.current = auth.csrfToken;
      setUser(auth.user);
      setSettings(store);
      setState({ products, cart, orders });
      setError("");
    } catch (cause) {
      if (generation.current !== current) return;
      const message =
        cause instanceof Error ? cause.message : "Layanan belum tersedia.";
      if (
        hasSnapshot.current &&
        !(cause instanceof ApiError && cause.status === 401)
      ) {
        if (lastRefreshError.current !== message) {
          lastRefreshError.current = message;
          notify({
            kind: "error",
            title: "Data belum dapat diperbarui",
            message,
          });
        }
        return;
      }
      setState(emptyState);
      setUser(null);
      csrf.current = null;
      setError(
        cause instanceof Error ? cause.message : "Layanan belum tersedia.",
      );
    } finally {
      if (generation.current === current) setLoading(false);
    }
  }, [notify]);
  useEffect(() => {
    const reload = () => {
      void refresh();
    };
    const initial = window.setTimeout(reload, 0);
    window.addEventListener("focus", reload);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") reload();
    }, 30000);
    return () => {
      invalidateReads();
      window.clearTimeout(initial);
      window.removeEventListener("focus", reload);
      window.clearInterval(timer);
    };
  }, [refresh, invalidateReads]);
  async function mutate<T>(path: string, body: unknown, method = "POST") {
    try {
      return await request<T>(path, body, method, csrf.current);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setUser(null);
        setState((s) => ({ ...s, cart: [], orders: [] }));
        csrf.current = null;
      }
      throw cause;
    }
  }
  async function changeCart(
    productId: string,
    quantity: number,
    mode: "add" | "set",
  ) {
    if (!user)
      throw new ApiError(
        401,
        "Masuk terlebih dahulu untuk menyimpan keranjang.",
      );
    const cart = await mutate<BasketLine[]>("/customer/cart", {
      productId,
      quantity,
      mode,
    });
    setState((s) => ({ ...s, cart }));
  }
  return (
    <Context.Provider
      value={{
        state,
        user,
        settings,
        loading,
        error,
        refresh,
        authenticate: async (email, password, name) => {
          const result = await request<AuthResult>(
            name ? "/auth/register" : "/auth/login",
            { email, password, ...(name ? { name } : {}) },
            "POST",
          );
          if (!result.user) throw new Error("Akun belum dapat diakses.");
          csrf.current = result.csrfToken;
          setUser(result.user);
          await refresh();
          return result.user;
        },
        logout: async () => {
          await mutate("/auth/logout", {});
          generation.current++;
          csrf.current = null;
          setUser(null);
          setState((s) => ({ ...s, cart: [], orders: [] }));
        },
        add: (id, quantity) => changeCart(id, quantity, "add"),
        update: (id, quantity) => changeCart(id, quantity, "set"),
        remove: async (id) => {
          const cart = await mutate<BasketLine[]>(
            `/customer/cart/${encodeURIComponent(id)}`,
            {},
            "DELETE",
          );
          setState((s) => ({ ...s, cart }));
        },
        checkout: async (contact, fulfillmentMethod, key) => {
          try {
            const order = await mutate<ShopOrder>("/customer/checkout", {
              contact,
              fulfillmentMethod,
              key,
              lines: state.cart.map(({ productId, quantity, unitPrice }) => ({
                productId,
                quantity,
                unitPrice,
              })),
            });
            await refresh();
            return order;
          } catch (cause) {
            await refresh();
            throw cause;
          }
        },
        cancel: async (id, reason) => {
          await mutate(`/customer/orders/${encodeURIComponent(id)}/cancel`, {
            reason,
          });
          await refresh();
        },
        saveProfile: async (contact) => {
          setUser(
            await mutate<CustomerUser>("/customer/profile", contact, "PATCH"),
          );
        },
        adminRequest,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useShop() {
  const context = useContext(Context);
  if (!context) throw new Error("CustomerProvider diperlukan.");
  return context;
}
