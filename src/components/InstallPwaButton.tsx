import { ActionIcon, Button, List, Modal, Text, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconDownload, IconShare2, IconSquarePlus } from "@tabler/icons-react";
import { usePwaInstall } from "../hooks/usePwaInstall";

interface InstallPwaButtonProps {
  /** "icon": nút tròn trên header; "full": nút full-width trong menu */
  variant?: "icon" | "full";
}

/**
 * Nút cài app: Chrome/Android bật prompt cài trực tiếp,
 * iOS mở hướng dẫn "Thêm vào MH chính". Ẩn khi đã chạy trong app.
 */
const InstallPwaButton = ({ variant = "icon" }: InstallPwaButtonProps) => {
  const { canPrompt, needsIosGuide, isStandalone, install } = usePwaInstall();
  const [guideOpened, { open: openGuide, close: closeGuide }] = useDisclosure(false);

  if (isStandalone || (!canPrompt && !needsIosGuide)) return null;

  const handleClick = () => {
    if (canPrompt) {
      install();
    } else {
      openGuide();
    }
  };

  return (
    <>
      {variant === "icon" ? (
        <Tooltip label="Cài đặt ứng dụng">
          <ActionIcon
            variant="default"
            size="lg"
            radius="xl"
            onClick={handleClick}
            aria-label="Cài đặt ứng dụng"
          >
            <IconDownload size={18} />
          </ActionIcon>
        </Tooltip>
      ) : (
        <Button
          variant="light"
          fullWidth
          leftSection={<IconDownload size={16} />}
          onClick={handleClick}
        >
          Cài đặt ứng dụng
        </Button>
      )}

      <Modal
        opened={guideOpened}
        onClose={closeGuide}
        title="Cài đặt ứng dụng lên iPhone/iPad"
        centered
      >
        <Text size="sm" mb="sm">
          Mở trang này bằng <b>Safari</b>, sau đó:
        </Text>
        <List size="sm" spacing="sm">
          <List.Item icon={<IconShare2 size={18} />}>
            Bấm nút <b>Chia sẻ</b> ở thanh công cụ
          </List.Item>
          <List.Item icon={<IconSquarePlus size={18} />}>
            Chọn <b>Thêm vào MH chính</b> (Add to Home Screen)
          </List.Item>
        </List>
        <Text size="sm" mt="sm" c="dimmed">
          App sẽ xuất hiện trên màn hình chính như ứng dụng bình thường.
        </Text>
      </Modal>
    </>
  );
};

export default InstallPwaButton;
