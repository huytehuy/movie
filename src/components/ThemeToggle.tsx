import { ActionIcon, useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";

const ThemeToggle = () => {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme("dark");

  return (
    <ActionIcon
      variant="default"
      size="lg"
      radius="xl"
      onClick={() => setColorScheme(computed === "dark" ? "light" : "dark")}
      aria-label="Đổi giao diện sáng/tối"
    >
      {computed === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
    </ActionIcon>
  );
};

export default ThemeToggle;
