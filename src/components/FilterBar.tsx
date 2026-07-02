import { Group, Select } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { COUNTRIES, GENRES, YEARS } from "../data/filters";

interface FilterBarProps {
  /** Giá trị đang chọn theo route hiện tại (nếu có) */
  activeGenre?: string;
  activeCountry?: string;
  activeYear?: string;
}

/** 3 dropdown lọc: chọn 1 mục sẽ điều hướng sang trang lọc tương ứng */
const FilterBar = ({ activeGenre, activeCountry, activeYear }: FilterBarProps) => {
  const navigate = useNavigate();

  const handleChange = (base: string) => (slug: string | null) => {
    if (slug) navigate(`/${base}/${slug}`);
  };

  return (
    <Group justify="center" gap="sm" mb="lg">
      <Select
        placeholder="Thể loại"
        data={GENRES.map((g) => ({ value: g.slug, label: g.label }))}
        value={activeGenre || null}
        onChange={handleChange("the-loai")}
        searchable
        clearable={false}
        w={{ base: "100%", xs: 180 }}
        comboboxProps={{ withinPortal: true }}
      />
      <Select
        placeholder="Quốc gia"
        data={COUNTRIES.map((c) => ({ value: c.slug, label: c.label }))}
        value={activeCountry || null}
        onChange={handleChange("quoc-gia")}
        searchable
        clearable={false}
        w={{ base: "100%", xs: 160 }}
        comboboxProps={{ withinPortal: true }}
      />
      <Select
        placeholder="Năm"
        data={YEARS.map((y) => ({ value: y.slug, label: y.label }))}
        value={activeYear || null}
        onChange={handleChange("nam")}
        w={{ base: "100%", xs: 110 }}
        comboboxProps={{ withinPortal: true }}
      />
    </Group>
  );
};

export default FilterBar;
