"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Box,
  Paper,
  Stack,
  SelectChangeEvent,
} from "@mui/material";

const Container = dynamic(
  () => import("@mui/material").then((mod) => mod.Container),
  { ssr: false }
);

interface WardrobeItem {
  item_name: string;
  type: string;
  color: string;
  style: string;
  fit: string;
}

const itemTypes = [
  "Shirt",
  "Pants",
  "Dress",
  "Skirt",
  "Jacket",
  "Shoes",
  "Accessory",
];
const styleOptions = ["Casual", "Formal", "Business", "Athletic", "Party"];
const fitOptions = ["Slim", "Regular", "Loose", "Oversized"];

export default function AddItem() {
  const [item, setItem] = useState<WardrobeItem>({
    item_name: "",
    type: "",
    color: "",
    style: "",
    fit: "",
  });
  const [message, setMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setItem({
      ...item,
      [e.target.name]: e.target.value,
    });
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    setItem({
      ...item,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:8000/wardrobe/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(item),
      });

      const data = await response.json();
      if (data.status === "success") {
        setMessage("Item added successfully!");
        // Reset form
        setItem({
          item_name: "",
          type: "",
          color: "",
          style: "",
          fit: "",
        });
      } else {
        setMessage("Error adding item");
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage("Error adding item");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{ mb: 4, textAlign: "center" }}
        >
          Add New Item to Wardrobe
        </Typography>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Item Name"
                name="item_name"
                value={item.item_name}
                onChange={handleChange}
                required
                variant="outlined"
              />

              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  flexDirection: { xs: "column", sm: "row" },
                }}
              >
                <FormControl fullWidth>
                  <InputLabel id="type-label">Type</InputLabel>
                  <Select
                    labelId="type-label"
                    name="type"
                    value={item.type}
                    onChange={handleSelectChange}
                    required
                    label="Type"
                  >
                    {itemTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Color"
                  name="color"
                  value={item.color}
                  onChange={handleChange}
                  required
                  variant="outlined"
                />
              </Box>

              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  flexDirection: { xs: "column", sm: "row" },
                }}
              >
                <FormControl fullWidth>
                  <InputLabel id="style-label">Style</InputLabel>
                  <Select
                    labelId="style-label"
                    name="style"
                    value={item.style}
                    onChange={handleSelectChange}
                    required
                    label="Style"
                  >
                    {styleOptions.map((style) => (
                      <MenuItem key={style} value={style}>
                        {style}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel id="fit-label">Fit</InputLabel>
                  <Select
                    labelId="fit-label"
                    name="fit"
                    value={item.fit}
                    onChange={handleSelectChange}
                    required
                    label="Fit"
                  >
                    {fitOptions.map((fit) => (
                      <MenuItem key={fit} value={fit}>
                        {fit}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                sx={{ height: 48, mt: 2 }}
              >
                Add to Wardrobe
              </Button>
            </Stack>
          </form>
          {message && (
            <Typography
              variant="subtitle1"
              color={message.includes("Error") ? "error" : "success"}
              sx={{ mt: 2, textAlign: "center" }}
            >
              {message}
            </Typography>
          )}
        </Paper>
      </Container>
    </div>
  );
}
