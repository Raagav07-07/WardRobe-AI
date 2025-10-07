"use client";

import { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  styled,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CheckroomIcon from "@mui/icons-material/Checkroom";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import ChatIcon from "@mui/icons-material/Chat";
import NextLink from "next/link";

// Create styled components for Next.js Link integration
const LinkButton = styled(Button)({
  textDecoration: "none",
  color: "inherit",
});

const StyledLink = styled(NextLink)({
  textDecoration: "none",
  color: "inherit",
});

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { text: "Chat with Tara", href: "/", icon: <ChatIcon /> },
    { text: "Your Wardrobe", href: "/wardrobe", icon: <CheckroomIcon /> },
    { text: "Add Item", href: "/wardrobe/add", icon: <AddCircleIcon /> },
  ];

  const drawer = (
    <Box sx={{ width: 250 }} role="presentation" onClick={handleDrawerToggle}>
      <List>
        {menuItems.map((item) => (
          <StyledLink href={item.href} key={item.text}>
            <ListItemButton>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </StyledLink>
        ))}
      </List>
    </Box>
  );

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            WardRobe AI
          </Typography>
          <Box sx={{ display: { xs: "none", sm: "block" } }}>
            {menuItems.map((item) => (
              <StyledLink href={item.href} key={item.text}>
                <LinkButton color="inherit" startIcon={item.icon}>
                  {item.text}
                </LinkButton>
              </StyledLink>
            ))}
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="temporary"
        anchor="left"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: "block", sm: "none" },
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: 250 },
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
}
