import { AppShell, Box, Burger, NavLink} from '@mantine/core';
import Router from './Router'
import '@mantine/core/styles.css';
import { useDisclosure } from '@mantine/hooks';
import Logo from './assets/HUYTEHUY.png';
import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {isMobile} from 'react-device-detect';

const data = [
  {name:'Phim đang hot',
  link:''},
  {name:'Phim lẻ',
  link:'phim_le'},
  {name:'Phim bộ',
  link:'phim_bo'},
  {name:'Phim mới',
  link:'phim_moi'},
];
function App() {
  const [opened, {toggle}] = useDisclosure();
  const [active, setActive] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const currentPath = location.pathname.substring(1); // Remove the leading slash
    const activeIndex = data.findIndex(item => item.link === currentPath);
    setActive(activeIndex >= 0 ? activeIndex : 0);
  }, [location]);

  const items = data.map((item, index) => (
    <Link to={`/${item.link}`} color='white'>
    <NavLink
      key={item.name}
      active={index === active}
      label={item.name}
      onClick={() => setActive(index)}
    />
    </Link>
  ));
  return (
    <AppShell
      header={{ height: 70 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
      <div style={{display:'flex',justifyContent:isMobile?'space-between':'center',alignItems:'center',height:'100%'}}>
      <Burger size="md" display={isMobile?'block':'none'} opened={opened} onClick={toggle} aria-label="Toggle navigation" />
      <Link to="/">
          <img height='50' src={Logo} alt="logo" />
        </Link>
      <div style={{display:isMobile?'block':'none'}}></div>
      </div>
        
      </AppShell.Header>

      <AppShell.Navbar p="md">

      <Box w={'100%'}>
        {items}
        </Box>
        </AppShell.Navbar>

      <AppShell.Main>
      <Router/>
      </AppShell.Main>
    </AppShell>
    
  )
}

export default App
