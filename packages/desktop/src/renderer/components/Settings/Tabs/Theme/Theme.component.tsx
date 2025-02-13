import React from 'react'
import { styled } from '@mui/material/styles'
import { Grid, Typography, Divider, ListItemButton, ListItemText, ListItemIcon } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import { ThemePreference } from '@quiet/state-manager'

const PREFIX = 'ThemeSettings'

const classes = {
  root: `${PREFIX}root`,
  titleContainer: `${PREFIX}titleContainer`,
  optionsContainer: `${PREFIX}optionsContainer`,
}

const StyledGrid = styled(Grid)(({ theme }) => ({
  [`& .${classes.titleContainer}`]: {
    marginBottom: 16,
  },
  [`& .${classes.optionsContainer}`]: {
    marginTop: 8,
  },
}))

export interface ThemeSettingsProps {
  currentTheme: ThemePreference
  onThemeChange: (theme: ThemePreference) => void
}

export const ThemeComponent: React.FC<ThemeSettingsProps> = ({ currentTheme, onThemeChange }) => {
  return (
    <StyledGrid container>
      <Grid item xs={12} className={classes.titleContainer}>
        <Typography variant='h4'>Theme</Typography>
      </Grid>
      <Grid item xs={12} className={classes.optionsContainer}>
        <Divider />
        <ListItemButton data-testid={'theme-light-button'} onClick={() => onThemeChange(ThemePreference.light)}>
          <ListItemText>Light</ListItemText>
          <ListItemIcon>
            {currentTheme === ThemePreference.light && <CheckIcon sx={{ marginLeft: 'auto' }} />}
          </ListItemIcon>
        </ListItemButton>
        <Divider />
        <Divider />
        <ListItemButton data-testid={'theme-dark-button'} onClick={() => onThemeChange(ThemePreference.dark)}>
          <ListItemText>Dark</ListItemText>
          <ListItemIcon>
            {currentTheme === ThemePreference.dark && <CheckIcon sx={{ marginLeft: 'auto' }} />}
          </ListItemIcon>
        </ListItemButton>
        <Divider />
        <Divider />
        <ListItemButton data-testid={'theme-system-button'} onClick={() => onThemeChange(ThemePreference.system)}>
          <ListItemText>System</ListItemText>
          <ListItemIcon>
            {currentTheme === ThemePreference.system && <CheckIcon sx={{ marginLeft: 'auto' }} />}
          </ListItemIcon>
        </ListItemButton>
        <Divider />
      </Grid>
    </StyledGrid>
  )
}

export default ThemeComponent
