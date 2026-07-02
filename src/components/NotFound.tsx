import { Button, Center, Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router-dom";

const NotFound = () => (
  <Center mih="60vh">
    <Stack align="center" gap="sm">
      <Title order={1} size={72} c="red">404</Title>
      <Text size="xl">Trang không tồn tại</Text>
      <Button component={Link} to="/" variant="light" mt="md">
        Về trang chủ
      </Button>
    </Stack>
  </Center>
);

export default NotFound;
