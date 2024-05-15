import { AppShell, Burger } from '@mantine/core';
import Router from './Router'
import '@mantine/core/styles.css';
import { useDisclosure } from '@mantine/hooks';
import Logo from './assets/HUYTEHUY.png';

function App() {
  const [opened, { toggle }] = useDisclosure();
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
        {/* <Burger
          opened={opened}
          onClick={toggle}
          hiddenFrom="sm"
          size="sm"
        /> */}
        <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100%'}}>
        <img style={{position:'absolute',justifyContent:'center',alignItems:'center'}}height='50' src={Logo} alt="logo" />
        </div>
        
      </AppShell.Header>

      <AppShell.Navbar p="md">Navbar</AppShell.Navbar>

      <AppShell.Main>
      <Router/>
      </AppShell.Main>
    </AppShell>
    
  )
}

export default App
