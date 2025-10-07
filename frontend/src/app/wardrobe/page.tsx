"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Button,
  Typography,
  IconButton,
  Box,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";

const Container = dynamic(
  () => import("@mui/material").then((mod) => mod.Container),
  { ssr: false }
);

interface WardrobeItem {
  _id: string;
  item_name: string;
  type: string;
  color: string;
  style: string;
  fit: string;
  last_worn: string | null;
  times_worn: number;
}

export default function Wardrobe() {
  const [items, setItems] = useState<WardrobeItem[]>([]);

  const fetchWardrobe = async () => {
    try {
      const response = await fetch("http://localhost:8000/wardrobe");
      const data = await response.json();
      if (data.status === "success") {
        setItems(data.data);
      }
    } catch (error) {
      console.error("Error fetching wardrobe:", error);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/wardrobe/${itemId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchWardrobe(); // Refresh the list
      }
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const handleMarkWorn = async (itemId: string) => {
    try {
      const response = await fetch(
        `http://localhost:8000/wardrobe/${itemId}/worn`,
        {
          method: "PUT",
        }
      );
      if (response.ok) {
        fetchWardrobe(); // Refresh the list
      }
    } catch (error) {
      console.error("Error marking item as worn:", error);
    }
  };

  useEffect(() => {
    fetchWardrobe();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{ mb: 4, textAlign: "center" }}
        >
          Your Wardrobe
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
            },
            gap: 3,
          }}
        >
          {items.map((item) => (
            <Card
              key={item._id}
              sx={{ height: "100%", display: "flex", flexDirection: "column" }}
            >
              <CardHeader
                title={item.item_name}
                subheader={`${item.type} - ${item.color}`}
                sx={{ pb: 1 }}
              />
              <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  component="div"
                >
                  <Box sx={{ display: "grid", gap: 1 }}>
                    <div>Style: {item.style}</div>
                    <div>Fit: {item.fit}</div>
                    <div>Times Worn: {item.times_worn}</div>
                    <div>
                      Last Worn:{" "}
                      {item.last_worn
                        ? new Date(item.last_worn).toLocaleDateString()
                        : "Never"}
                    </div>
                  </Box>
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: "flex-end", pt: 0 }}>
                <IconButton
                  onClick={() => handleMarkWorn(item._id)}
                  title="Mark as worn"
                  size="small"
                >
                  <CheckIcon />
                </IconButton>
                <IconButton
                  onClick={() => handleDelete(item._id)}
                  title="Delete item"
                  color="error"
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          ))}
        </Box>
        {items.length === 0 && (
          <Typography
            variant="h6"
            sx={{
              textAlign: "center",
              mt: 4,
              color: "text.secondary",
            }}
          >
            Your wardrobe is empty. Start by adding some items!
          </Typography>
        )}
      </Container>
    </div>
  );
}
