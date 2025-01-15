import { useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../../firebase/firebaseConfig';
import { Avatar, Button, Loader, Menu } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconBrandGoogleFilled } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

function GoogleLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthChecked(true);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      await signInWithPopup(auth, provider);
      notifications.show({
        title: 'Success',
        message: 'Logged in successfully',
        color: 'green',
      });
    } catch (error) {
      console.error('Error during Google login', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to login. Please try again.',
        color: 'red',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      notifications.show({
        title: 'Success',
        message: 'Logged out successfully',
        color: 'green',
      });
    } catch (error) {
      console.error('Error during logout', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to logout. Please try again.',
        color: 'red',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="flex justify-center items-center">
        <Loader color="blue" size="sm" />
      </div>
    );
  }

  return (
    <div>
      {currentUser ? (
        <Menu shadow="md" width="fit-content">
          <Menu.Target>
            <Button h={50} variant="transparent">
              <Avatar
                src={currentUser.photoURL || ''}
                color="cyan"
                radius="xl"
                alt={currentUser.displayName || 'User Avatar'}
              />
            </Button>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Divider />
            <Menu.Item>
              <Button
                component={Link}
                to="/history"
                variant="light"
                color="blue"
                fullWidth
              >
                Watch History
              </Button>
            </Menu.Item>
            <Menu.Item>
              <Button
                color="red"
                onClick={handleLogout}
                loading={isLoading}
                fullWidth
              >
                Logout
              </Button>
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      ) : (
        <Button
          onClick={handleGoogleLogin}
          loading={isLoading}
          leftSection={<IconBrandGoogleFilled size={14} />}
        >
          Login with Google to save progress
        </Button>
      )}
    </div>
  );
}

export default GoogleLogin;