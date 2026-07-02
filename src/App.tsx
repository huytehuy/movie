import { AppShell, Box, Burger, Group, LoadingOverlay, NavLink } from "@mantine/core";
import Router from "./Router";
import "@mantine/core/styles.css";
import "@mantine/carousel/styles.css";
import "@mantine/notifications/styles.css";
import { useDisclosure } from "@mantine/hooks";
import Logo from "./assets/HUYTEHUY.png";
import { Link, useLocation } from "react-router-dom";
import React, { useEffect, useState } from "react";
import SearchInput from "./components/SearchInput";
import GoogleLogin from "./components/Login/Google";
import ThemeToggle from "./components/ThemeToggle";
import InstallPwaButton from "./components/InstallPwaButton";
import { auth } from "./firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

const NAV_ITEMS = [
  { name: "Trang chủ", link: "" },
  { name: "Phim lẻ", link: "phim_le" },
  { name: "Phim bộ", link: "phim_bo" },
  { name: "Phim đang chiếu", link: "phim_dang_chieu" },
  { name: "Phim mới cập nhật", link: "phim_moi_cap_nhat" },
];

function App() {
  const [opened, { toggle, close }] = useDisclosure();
  const [authChecked, setAuthChecked] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!auth) {
      setAuthChecked(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, () => {
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);

  // Đóng menu mobile khi chuyển trang
  useEffect(() => {
    close();
  }, [location.pathname, close]);

  if (!authChecked) {
    return <LoadingOverlay visible />;
  }

  const currentPath = location.pathname.substring(1);
  const items = NAV_ITEMS.map((item) => (
    <NavLink
      key={item.name}
      component={Link}
      to={`/${item.link}`}
      active={item.link === currentPath}
      label={item.name}
      style={{ borderRadius: 8 }}
    />
  ));

  return (
    <React.Suspense fallback={<LoadingOverlay visible />}>
      <AppShell
        // Chừa chỗ cho status bar (pin/giờ) khi chạy PWA standalone
        header={{ height: "calc(64px + env(safe-area-inset-top))" }}
        navbar={{
          width: 220,
          breakpoint: "sm",
          collapsed: { mobile: !opened },
        }}
        padding="md"
      >
        <AppShell.Header
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingLeft: "env(safe-area-inset-left)",
            paddingRight: "env(safe-area-inset-right)",
          }}
        >
          <Group h={64} px="md" gap="sm" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Menu" />
            <Link to="/" style={{ display: "flex", alignItems: "center" }}>
              <img height={44} src={Logo} alt="Huytehuy Movies" />
            </Link>
            <Box style={{ flex: 1, display: "flex", justifyContent: "center" }}>
              <SearchInput />
            </Box>
            <Box visibleFrom="xs">
              <InstallPwaButton />
            </Box>
            <ThemeToggle />
            <Box visibleFrom="sm">
              <GoogleLogin />
            </Box>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar
          p="md"
          style={{
            paddingBottom: "calc(var(--mantine-spacing-md) + env(safe-area-inset-bottom))",
            paddingLeft: "calc(var(--mantine-spacing-md) + env(safe-area-inset-left))",
          }}
        >
          <Box hiddenFrom="sm" mb="md">
            <GoogleLogin />
          </Box>
          <Box w="100%">{items}</Box>
          <Box hiddenFrom="sm" mt="md">
            <InstallPwaButton variant="full" />
          </Box>
        </AppShell.Navbar>

        <AppShell.Main>
          <Router />
        </AppShell.Main>
      </AppShell>
    </React.Suspense>
  );
}

export default App;
