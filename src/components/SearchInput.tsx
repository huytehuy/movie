import { ActionIcon, Combobox, Group, Loader, Text, TextInput, useCombobox } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../config/api";
import { MovieSummary } from "../types/Movie";
import PlaceHolderImage from "../assets/800@3x.png";

const MAX_SUGGESTIONS = 6;

const SearchInput = () => {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebouncedValue(query, 300);
  const [suggestions, setSuggestions] = useState<MovieSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const combobox = useCombobox();
  // Tránh dropdown mở lại bởi kết quả trả về sau khi đã submit/chọn phim
  const skipNextResult = useRef(false);

  useEffect(() => {
    const keyword = debouncedQuery.trim();
    if (keyword.length < 2) {
      setSuggestions([]);
      setLoading(false);
      combobox.closeDropdown();
      return;
    }

    let cancelled = false;
    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const response = await axios.get(API.search(keyword));
        if (cancelled || skipNextResult.current) return;
        const items: MovieSummary[] = (response?.data?.items || []).slice(0, MAX_SUGGESTIONS);
        setSuggestions(items);
        if (items.length > 0) combobox.openDropdown();
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchSuggestions();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const reset = () => {
    skipNextResult.current = true;
    setQuery("");
    setSuggestions([]);
    combobox.closeDropdown();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const keyword = query.trim();
    if (!keyword) return;
    reset();
    navigate(`/search/${encodeURIComponent(keyword)}`);
  };

  const handleSelect = (slug: string) => {
    reset();
    navigate(`/detail/${slug}`);
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 420 }}>
      <Combobox store={combobox} onOptionSubmit={handleSelect} withinPortal>
        <Combobox.Target>
          <TextInput
            value={query}
            onChange={(e) => {
              skipNextResult.current = false;
              setQuery(e.target.value);
            }}
            onFocus={() => {
              if (suggestions.length > 0) combobox.openDropdown();
            }}
            onBlur={() => combobox.closeDropdown()}
            placeholder="Tìm phim..."
            radius="xl"
            leftSection={loading ? <Loader size={16} /> : <IconSearch size={16} />}
            rightSection={
              <ActionIcon type="submit" variant="filled" radius="xl" aria-label="Tìm kiếm">
                <IconSearch size={16} />
              </ActionIcon>
            }
          />
        </Combobox.Target>

        <Combobox.Dropdown
          hidden={suggestions.length === 0}
          style={{ minWidth: "min(320px, calc(100vw - 24px))" }}
        >
          <Combobox.Options>
            {suggestions.map((movie) => (
              <Combobox.Option value={movie.slug} key={movie.slug}>
                <Group gap="sm" wrap="nowrap">
                  <img
                    src={movie.thumb_url || PlaceHolderImage}
                    alt={movie.name}
                    width={32}
                    height={44}
                    style={{ objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
                    loading="lazy"
                  />
                  <div style={{ minWidth: 0 }}>
                    <Text size="sm" lineClamp={1}>
                      {movie.name}
                    </Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {movie.original_name || movie.origin_name}
                    </Text>
                  </div>
                </Group>
              </Combobox.Option>
            ))}
          </Combobox.Options>
          <Combobox.Footer>
            <Text size="xs" c="dimmed">
              Nhấn Enter để xem tất cả kết quả
            </Text>
          </Combobox.Footer>
        </Combobox.Dropdown>
      </Combobox>
    </form>
  );
};

export default SearchInput;
