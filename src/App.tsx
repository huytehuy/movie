import { AppShell, Box, Burger, LoadingOverlay, NavLink } from "@mantine/core";
import Router from "./Router";
import "@mantine/core/styles.css";
import { useDisclosure } from "@mantine/hooks";
import Logo from "./assets/HUYTEHUY.png";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { isMobile } from "react-device-detect";
import SearchInput from "./components/SearchData";
import GoogleLogin from "./components/Login/Google";
import { useUser } from "./context/UserContext";
import React from "react";

const data = [
  {
    name: "Trang chủ",
    link: "",
  },
  {
    name: "Phim lẻ",
    link: "phim_le",
  },
  {
    name: "Phim bộ",
    link: "phim_bo",
  },
  {
    name: "Phim đang chiếu",
    link: "phim_dang_chieu",
  },
  // {
  //   name: 'Trực tiếp bóng đá',
  //   link: 'sport'
  // },
];
function App() {
  const [opened, { toggle }] = useDisclosure();
  const [active, setActive] = useState(0);
  const location = useLocation();
  const { user } = useUser();

  useEffect(() => {
    const currentPath = location.pathname.substring(1); // Remove the leading slash
    const activeIndex = data.findIndex((item) => item.link === currentPath);
    setActive(activeIndex >= 0 ? activeIndex : -1);
  }, [location]);
  const items = data.map((item, index) => (
    <Link to={`/${item.link}`} key={index}>
      <NavLink
        key={item.name}
        active={index === active}
        label={item.name}
        onClick={toggle}
      />
    </Link>
  ));
  return (
    <React.Suspense fallback={<LoadingOverlay/>}>
    <AppShell
      header={{ height: 70 }}
      navbar={{
        width: 200,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        {isMobile ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              height: "100%",
              paddingLeft: 10,
              paddingRight: 10,
            }}
          >
            <Burger
              size="md"
              display={"block"}
              opened={opened}
              onClick={toggle}
              aria-label="Toggle navigation"
            />

            <div
              style={{
                paddingRight: 20,
                paddingLeft: 20,
                marginLeft: 0,
                display: "flex",
                justifyContent: "center",
                width: "100%",
              }}
            >
              <SearchInput />
            </div>
            {user ? (
              <GoogleLogin />
            ) : (
              <Link to="/">
                <img height="50" src={Logo} alt="logo" />
              </Link>
            )}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              height: "100%",
              paddingLeft: 10,
              paddingRight: 10,
            }}
          >
            <Burger
              size="md"
              display="none"
              opened={opened}
              onClick={toggle}
              aria-label="Toggle navigation"
            />
            <Link to="/">
              <img height="50" src={Logo} alt="logo" />
            </Link>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                width: "100%",
              }}
            >
              <SearchInput />
            </div>
            <GoogleLogin />
          </div>
        )}
      </AppShell.Header>
      <AppShell.Navbar p="md">
        {isMobile ? user ? null :<GoogleLogin />  : null}
        <Box w={"100%"}>{items}</Box>
      </AppShell.Navbar>
      <AppShell.Main>
        <Router />
      </AppShell.Main>
    </AppShell>
    </React.Suspense>
  );
}

export default App;
