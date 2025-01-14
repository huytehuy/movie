// src/components/GoogleLogin.tsx
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '../../firebase/firebaseConfig';
import { Avatar, Button, Menu } from '@mantine/core';
import { IconBrandGoogleFilled } from '@tabler/icons-react';
import { useUser } from '../../context/UserContext';



function GoogleLogin() {
    const { user, setUser } = useUser();

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' }); // Force account selection
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      console.error('Error during Google login', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Error during logout', error);
    }
  };

  return (
    <div>
      {!user ? (
        <Button onClick={handleGoogleLogin}>Login with Google <IconBrandGoogleFilled style={{marginLeft:5,marginRight:5}} size={14} /> to save progress</Button>
      ) : (
        <div>
            <Menu shadow="md" width={"fit-content"}>
                <Menu.Target>
                    
                    <Button h={50} variant='transparent' ><Avatar  src={user.photoURL} color="cyan" radius="xl" alt="User Avatar" /></Button>
                </Menu.Target>
                <Menu.Dropdown>
                    <Menu.Item>
                    <Button color='red' onClick={handleLogout}>Logout</Button>
                    </Menu.Item>
                </Menu.Dropdown>
            </Menu>
          {/* <h3>User Information</h3>
          <p>Name: {user.displayName}</p>
          <p>Email: {user.email}</p> */}
          {/* <img src={user.photoURL} alt="User Avatar" />
          <button onClick={handleLogout}>Logout</button> */}
        </div>
      )}
    </div>
  );
}

export default GoogleLogin;