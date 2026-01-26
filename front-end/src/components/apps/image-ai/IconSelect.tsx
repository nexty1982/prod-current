import { Box, FormControl, MenuItem, Select, Typography } from "@mui/material";

type IconSelectOption = {
  id: number;
  label: string;
  icon: any;
};

type IconSelectProps = {
  value: number;
  options: IconSelectOption[];
  onChange: (selected: IconSelectOption) => void;
  iconInCircle?: boolean;
};

const IconSelect = ({
  value,
  options,
  onChange,

  iconInCircle = true,
}: IconSelectProps) => {
  return (
    <FormControl size="small">
      <Select
        value={value}
        onChange={(e) => {
          const selectedOption = options.find(
            (item) => item.id === e.target.value
          );
          if (selectedOption) onChange(selectedOption);
        }}
        renderValue={(selectedId) => {
          const selectedOption = options.find((item) => item.id === selectedId);
          const IconComponent = selectedOption?.icon;
          return (
            <Box display="flex" alignItems="center" gap={1}>
              {/* <Icon
                icon={selectedOption?.icon ?? "mdi:alert"}
                width={20}
                height={20}
              /> */}

              {IconComponent && <IconComponent size={20} />}
              <Typography>{selectedOption?.label}</Typography>
            </Box>
          );
        }}
        IconComponent={() => null}
      >
        {options.map((option) => {
          const IconComponent = option.icon;
          return (
            <MenuItem key={option.id} value={option.id}>
              <Box display="flex" alignItems="center" gap={1}>
                {iconInCircle ? (
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    width={24}
                    height={24}
                    borderRadius="50%"
                    bgcolor="primary.light"
                    color="primary.main"
                  >
                    {IconComponent && <IconComponent size={16} />}
                  </Box>
                ) : (
                  IconComponent && <IconComponent size={20} />
                )}
                {option.label}
              </Box>
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );
};

export default IconSelect;
