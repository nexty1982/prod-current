import { enhancedTableStore, THEME_MAP, type LiturgicalThemeKey, type ThemeTokens } from '@/store/enhancedTableStore';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Palette as PaletteIcon,
    Save as SaveIcon,
    Settings as SettingsIcon,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    IconButton,
    Paper,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
    useTheme,
} from '@mui/material';
import React from 'react';
import { DEFAULT_THEME_TOKENS } from './constants';
import type { EditingTheme, ThemeStudioState } from './types';

interface ThemeStudioTabProps {
  themeStudio: ThemeStudioState;
  setThemeStudio: React.Dispatch<React.SetStateAction<ThemeStudioState>>;
  editingTheme: EditingTheme | null;
  setEditingTheme: React.Dispatch<React.SetStateAction<EditingTheme | null>>;
  themeDialogOpen: boolean;
  setThemeDialogOpen: (open: boolean) => void;
  saveAsDialogOpen: boolean;
  setSaveAsDialogOpen: (open: boolean) => void;
  newThemeName: string;
  setNewThemeName: (name: string) => void;
  previewTheme: ThemeTokens | null;
  setPreviewTheme: (theme: ThemeTokens | null) => void;
  colorConfigDialogOpen: boolean;
  setColorConfigDialogOpen: (open: boolean) => void;
  configuringColorKey: keyof ThemeTokens | null;
  setConfiguringColorKey: (key: keyof ThemeTokens | null) => void;
  saving: boolean;
  error: string | null;
  success: string | null;
  setError: (error: string | null) => void;
  setSuccess: (success: string | null) => void;
  loadThemes: (isGlobal: boolean) => void;
  saveThemes: () => Promise<void>;
  handleCancel: () => void;
}

const ThemeStudioTab: React.FC<ThemeStudioTabProps> = ({
  themeStudio,
  setThemeStudio,
  editingTheme,
  setEditingTheme,
  themeDialogOpen,
  setThemeDialogOpen,
  saveAsDialogOpen,
  setSaveAsDialogOpen,
  newThemeName,
  setNewThemeName,
  previewTheme,
  setPreviewTheme,
  colorConfigDialogOpen,
  setColorConfigDialogOpen,
  configuringColorKey,
  setConfiguringColorKey,
  saving,
  error,
  success,
  setError,
  setSuccess,
  loadThemes,
  saveThemes,
  handleCancel,
}) => {
  const theme = useTheme();

  return (
    <Box>
      {/* Status Messages */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* Table Styling Preview */}
      <Typography variant="overline" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
        TABLE STYLING PREVIEW
      </Typography>
      <Box sx={{ mb: 3, overflow: 'auto' }}>
        {(() => {
          const currentState = enhancedTableStore.getState();
          const currentThemeKey = currentState.liturgicalTheme;
          let previewTokens: ThemeTokens;

          if (previewTheme) {
            previewTokens = previewTheme;
          } else if (currentThemeKey && THEME_MAP[currentThemeKey as LiturgicalThemeKey]) {
            previewTokens = THEME_MAP[currentThemeKey as LiturgicalThemeKey];
          } else if (currentState.customThemes && currentThemeKey && currentState.customThemes[currentThemeKey]) {
            previewTokens = currentState.customThemes[currentThemeKey];
          } else {
            previewTokens = DEFAULT_THEME_TOKENS as ThemeTokens;
          }

          const handleColorDoubleClick = (colorKey: keyof ThemeTokens) => {
            setConfiguringColorKey(colorKey);
            setColorConfigDialogOpen(true);
          };

          return (
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {['ID', 'First Name', 'Last Name', 'Date'].map((header) => (
                      <TableCell
                        key={header}
                        onDoubleClick={() => handleColorDoubleClick('headerBg')}
                        sx={{
                          backgroundColor: previewTokens.headerBg,
                          color: previewTokens.headerText,
                          cursor: 'pointer',
                          userSelect: 'none',
                          fontWeight: 'bold',
                          '&:hover': {
                            outline: '2px solid #1976d2',
                            outlineOffset: '-2px',
                          },
                        }}
                      >
                        <Tooltip title="Double-click to configure Header Background">
                          {header}
                        </Tooltip>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[1, 2, 3, 4, 5].map((row, idx) => (
                    <TableRow
                      key={row}
                      sx={{
                        backgroundColor: idx % 2 === 0 ? previewTokens.rowEvenBg : previewTokens.rowOddBg,
                        '& .MuiTableCell-root': {
                          color: previewTokens.cellText,
                          borderColor: previewTokens.border,
                          cursor: 'pointer',
                          '&:hover': {
                            outline: '2px solid #1976d2',
                            outlineOffset: '-2px',
                          },
                        },
                      }}
                      onDoubleClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.tagName === 'TD') {
                          handleColorDoubleClick(idx % 2 === 0 ? 'rowEvenBg' : 'rowOddBg');
                        }
                      }}
                    >
                      <TableCell onDoubleClick={() => handleColorDoubleClick('cellText')}>{row}</TableCell>
                      <TableCell onDoubleClick={() => handleColorDoubleClick('cellText')}>Sample {row}</TableCell>
                      <TableCell onDoubleClick={() => handleColorDoubleClick('cellText')}>Data {row}</TableCell>
                      <TableCell onDoubleClick={() => handleColorDoubleClick('cellText')}>{new Date().toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          );
        })()}
      </Box>

      <Typography variant="overline" color="text.secondary" sx={{ mb: 0.5, mt: 1, display: 'block', textAlign: 'center' }}>
        DOUBLE CLICK ANY ELEMENT TO CONFIGURE COLOR
      </Typography>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* Left Column - Theme Management */}
        <Grid item xs={12} md={5}>
          <Typography variant="overline" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            THEME MANAGEMENT
          </Typography>
          <Card variant="outlined" sx={{ p: 2.5, bgcolor: theme.palette.background.paper, mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="subtitle2" fontWeight={600}>Global Theme</Typography>
                <Typography variant="caption" color="text.secondary">Applies to all churches</Typography>
              </Box>
              <Switch
                checked={themeStudio.isGlobal}
                onChange={(e) => {
                  setThemeStudio(prev => ({ ...prev, isGlobal: e.target.checked }));
                  loadThemes(e.target.checked);
                }}
              />
            </Stack>
            {!themeStudio.isGlobal && (
              <Alert severity="info" sx={{ mt: 1.5, borderRadius: 1 }}>
                <Typography variant="caption">Church specific themes will override global themes for this church only.</Typography>
              </Alert>
            )}
          </Card>

          <Typography variant="overline" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            CHURCH-SPECIFIC THEMES
          </Typography>
          <Stack spacing={1}>
            {Object.entries(themeStudio.themes).map(([key, themeItem]) => (
              <Card key={key} variant="outlined" sx={{ p: 2, bgcolor: theme.palette.background.paper }}>
                <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" fontWeight={600}>{themeItem.name || key}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                      <Box sx={{ width: 20, height: 20, bgcolor: themeItem.headerBg, borderRadius: '50%', border: '1px solid', borderColor: 'divider' }} />
                      <Box sx={{ width: 20, height: 20, bgcolor: themeItem.accent, borderRadius: '50%', border: '1px solid', borderColor: 'divider' }} />
                      <Box sx={{ width: 20, height: 20, bgcolor: themeItem.rowOddBg, borderRadius: '50%', border: '1px solid', borderColor: 'divider' }} />
                    </Box>
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" onClick={() => {
                      setEditingTheme({ name: key, description: themeItem.description || '', tokens: themeItem });
                      setThemeDialogOpen(true);
                    }}>
                      <SettingsIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={async () => {
                      if (window.confirm(`Delete theme "${themeItem.name || key}"?`)) {
                        const newThemes = { ...themeStudio.themes };
                        delete newThemes[key];
                        setThemeStudio(prev => ({ ...prev, themes: newThemes }));
                        await saveThemes();
                      }
                    }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              </Card>
            ))}
            <Card
              variant="outlined"
              sx={{ p: 2, bgcolor: theme.palette.action.hover, cursor: 'pointer', textAlign: 'center', borderStyle: 'dashed' }}
              onClick={() => {
                setEditingTheme({
                  name: '', description: '',
                  tokens: DEFAULT_THEME_TOKENS as ThemeTokens,
                });
                setThemeDialogOpen(true);
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                <AddIcon fontSize="small" /> Add New Theme
              </Typography>
            </Card>
          </Stack>
        </Grid>

        {/* Right Column - Pre-defined Liturgical Themes */}
        <Grid item xs={12} md={7}>
          <Typography variant="overline" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            PRE-DEFINED LITURGICAL THEMES
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(THEME_MAP).map(([key, tokens]) => {
              const themeName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              const isSelected = themeStudio.selectedTheme === key || !!themeStudio.themes[key];
              return (
                <Grid item xs={12} sm={4} key={key}>
                  <Card
                    variant="outlined"
                    sx={{
                      p: 0,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: isSelected ? 2 : 1,
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      position: 'relative',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                    onClick={() => {
                      if (!themeStudio.themes[key]) {
                        setThemeStudio(prev => ({
                          ...prev,
                          selectedTheme: key,
                          themes: {
                            ...prev.themes,
                            [key]: { ...tokens, name: themeName, description: `Pre-defined ${themeName} theme` },
                          },
                        }));
                      } else {
                        setThemeStudio(prev => ({ ...prev, selectedTheme: key }));
                      }
                      setPreviewTheme(tokens);
                    }}
                  >
                    {isSelected && (
                      <Box sx={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: '50%', bgcolor: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography sx={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</Typography>
                      </Box>
                    )}
                    <Box sx={{ p: 1.5 }}>
                      <Typography variant="subtitle2" fontWeight={600} color="primary.main">{themeName}</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                        <Box sx={{ width: 16, height: 16, bgcolor: tokens.headerBg, borderRadius: '50%', border: '1px solid', borderColor: 'divider' }} />
                        <Box sx={{ width: 16, height: 16, bgcolor: tokens.accent, borderRadius: '50%', border: '1px solid', borderColor: 'divider' }} />
                        <Box sx={{ width: 16, height: 16, bgcolor: tokens.rowOddBg, borderRadius: '50%', border: '1px solid', borderColor: 'divider' }} />
                      </Box>
                    </Box>
                    <Box sx={{ bgcolor: tokens.headerBg, height: 6 }} />
                    <Box sx={{ bgcolor: tokens.rowOddBg, height: 4 }} />
                    <Box sx={{ bgcolor: tokens.rowEvenBg, height: 4 }} />
                    <Box sx={{ bgcolor: tokens.rowOddBg, height: 4 }} />
                    <Box sx={{ p: 1.5 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        fullWidth
                        startIcon={<PaletteIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTheme({
                            name: key, description: `Pre-defined ${themeName} theme`,
                            tokens: tokens, isPreDefined: true, originalKey: key,
                          });
                          setThemeDialogOpen(true);
                        }}
                        sx={{ textTransform: 'none', borderRadius: 2 }}
                      >
                        Edit Theme
                      </Button>
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Grid>
      </Grid>

      {/* Theme Editor Dialog */}
      <Dialog open={themeDialogOpen} onClose={() => setThemeDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTheme?.name ? `Edit Theme: ${editingTheme.name}` : 'Create New Theme'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Theme Name"
              value={editingTheme?.name || ''}
              onChange={(e) => setEditingTheme(prev => prev ? { ...prev, name: e.target.value } : null)}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={editingTheme?.description || ''}
              onChange={(e) => setEditingTheme(prev => prev ? { ...prev, description: e.target.value } : null)}
              fullWidth
              multiline
              rows={2}
            />
            <Divider />
            <Typography variant="subtitle2">Theme Colors</Typography>
            <Grid container spacing={2}>
              {([
                { key: 'headerBg', label: 'Header Background', default: '#1976d2' },
                { key: 'headerText', label: 'Header Text', default: '#ffffff' },
                { key: 'rowOddBg', label: 'Row Odd Background', default: '#fafafa' },
                { key: 'rowEvenBg', label: 'Row Even Background', default: '#ffffff' },
                { key: 'border', label: 'Border Color', default: '#e0e0e0' },
                { key: 'accent', label: 'Accent Color', default: '#1976d2' },
              ] as const).map(({ key, label, default: def }) => (
                <Grid item xs={12} sm={6} key={key}>
                  <TextField
                    label={label}
                    type="color"
                    value={editingTheme?.tokens[key] || def}
                    onChange={(e) => setEditingTheme(prev => prev ? {
                      ...prev,
                      tokens: { ...prev.tokens, [key]: e.target.value }
                    } : null)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              ))}
              <Grid item xs={12}>
                <TextField
                  label="Cell Text Color"
                  type="color"
                  value={editingTheme?.tokens.cellText || '#212121'}
                  onChange={(e) => setEditingTheme(prev => prev ? {
                    ...prev,
                    tokens: { ...prev.tokens, cellText: e.target.value }
                  } : null)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            <Divider />
            <Typography variant="subtitle2">Preview</Typography>
            {editingTheme && (
              <Box>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Box sx={{ bgcolor: editingTheme.tokens.headerBg, color: editingTheme.tokens.headerText, p: 2, borderRadius: 1, textAlign: 'center' }}>
                      Header
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ bgcolor: editingTheme.tokens.accent, color: editingTheme.tokens.cellText, p: 2, borderRadius: 1, textAlign: 'center' }}>
                      Accent
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ bgcolor: editingTheme.tokens.rowOddBg, color: editingTheme.tokens.cellText, p: 2, border: `1px solid ${editingTheme.tokens.border}`, borderRadius: 1, textAlign: 'center' }}>
                      Row Odd
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ bgcolor: editingTheme.tokens.rowEvenBg, color: editingTheme.tokens.cellText, p: 2, border: `1px solid ${editingTheme.tokens.border}`, borderRadius: 1, textAlign: 'center' }}>
                      Row Even
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setThemeDialogOpen(false);
            setEditingTheme(null);
            setSaveAsDialogOpen(false);
            setNewThemeName('');
          }}>Cancel</Button>

          {/* Update Template button - only show for pre-defined themes */}
          {editingTheme?.isPreDefined && editingTheme.originalKey && (
            <Button
              variant="outlined"
              color="primary"
              onClick={async () => {
                if (editingTheme && editingTheme.originalKey && editingTheme.originalKey in THEME_MAP) {
                  enhancedTableStore.updatePreDefinedTheme(
                    editingTheme.originalKey as LiturgicalThemeKey,
                    editingTheme.tokens
                  );

                  const newThemes = {
                    ...themeStudio.themes,
                    [editingTheme.originalKey]: {
                      ...editingTheme.tokens,
                      name: editingTheme.originalKey.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                      description: editingTheme.description,
                    },
                  };
                  setThemeStudio(prev => ({ ...prev, themes: newThemes }));
                  await saveThemes();
                  setSuccess(`Template "${editingTheme.originalKey}" updated successfully!`);
                  setThemeDialogOpen(false);
                  setEditingTheme(null);
                }
              }}
              disabled={!editingTheme?.name}
            >
              Update Template
            </Button>
          )}

          {/* Save Theme button */}
          <Button
            variant="contained"
            onClick={async () => {
              if (editingTheme?.isPreDefined) {
                setSaveAsDialogOpen(true);
              } else {
                if (editingTheme && editingTheme.name) {
                  const newThemes = {
                    ...themeStudio.themes,
                    [editingTheme.name]: {
                      ...editingTheme.tokens,
                      name: editingTheme.name,
                      description: editingTheme.description,
                    },
                  };
                  setThemeStudio(prev => ({ ...prev, themes: newThemes }));
                  await saveThemes();
                  setThemeDialogOpen(false);
                  setEditingTheme(null);
                }
              }
            }}
            disabled={!editingTheme?.name}
          >
            Save Theme
          </Button>
        </DialogActions>

        {/* Save As Dialog */}
        <Dialog open={saveAsDialogOpen} onClose={() => {
          setSaveAsDialogOpen(false);
          setNewThemeName('');
        }}>
          <DialogTitle>Save Theme As</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="New Theme Name"
              fullWidth
              variant="outlined"
              value={newThemeName}
              onChange={(e) => setNewThemeName(e.target.value)}
              placeholder="Enter a unique theme name"
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setSaveAsDialogOpen(false);
              setNewThemeName('');
            }}>Cancel</Button>
            <Button
              variant="contained"
              onClick={async () => {
                if (editingTheme && newThemeName.trim()) {
                  if (themeStudio.themes[newThemeName.trim()]) {
                    setError(`Theme "${newThemeName.trim()}" already exists. Please choose a different name.`);
                    return;
                  }

                  const newThemes = {
                    ...themeStudio.themes,
                    [newThemeName.trim()]: {
                      ...editingTheme.tokens,
                      name: newThemeName.trim(),
                      description: editingTheme.description || `Custom theme: ${newThemeName.trim()}`,
                    },
                  };
                  setThemeStudio(prev => ({ ...prev, themes: newThemes }));
                  await saveThemes();
                  setSuccess(`Theme "${newThemeName.trim()}" saved successfully!`);
                  setThemeDialogOpen(false);
                  setSaveAsDialogOpen(false);
                  setEditingTheme(null);
                  setNewThemeName('');
                }
              }}
              disabled={!newThemeName.trim()}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Dialog>

      {/* Color Configuration Dialog */}
      <Dialog open={colorConfigDialogOpen} onClose={() => setColorConfigDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Configure {configuringColorKey === 'headerBg' ? 'Header Background' :
                    configuringColorKey === 'headerText' ? 'Header Text' :
                    configuringColorKey === 'rowOddBg' ? 'Odd Row Background' :
                    configuringColorKey === 'rowEvenBg' ? 'Even Row Background' :
                    configuringColorKey === 'border' ? 'Border' :
                    configuringColorKey === 'accent' ? 'Accent' :
                    configuringColorKey === 'cellText' ? 'Cell Text' : 'Color'}
        </DialogTitle>
        <DialogContent>
          {configuringColorKey && (() => {
            const currentState = enhancedTableStore.getState();
            const currentThemeKey = currentState.liturgicalTheme;
            let currentTokens: ThemeTokens;

            if (previewTheme) {
              currentTokens = previewTheme;
            } else if (currentThemeKey && THEME_MAP[currentThemeKey as LiturgicalThemeKey]) {
              currentTokens = THEME_MAP[currentThemeKey as LiturgicalThemeKey];
            } else if (currentState.customThemes && currentThemeKey && currentState.customThemes[currentThemeKey]) {
              currentTokens = currentState.customThemes[currentThemeKey];
            } else {
              currentTokens = DEFAULT_THEME_TOKENS as ThemeTokens;
            }

            const currentColor = currentTokens[configuringColorKey];

            return (
              <Stack spacing={2} sx={{ mt: 2 }}>
                <TextField
                  label="Color"
                  type="color"
                  value={currentColor}
                  onChange={(e) => {
                    const newTokens = { ...currentTokens, [configuringColorKey]: e.target.value };
                    setPreviewTheme(newTokens);

                    if (currentThemeKey && currentState.customThemes && currentState.customThemes[currentThemeKey]) {
                      const updatedThemes = {
                        ...currentState.customThemes,
                        [currentThemeKey]: {
                          ...currentState.customThemes[currentThemeKey],
                          ...newTokens,
                        },
                      };
                      enhancedTableStore.setCustomThemes(updatedThemes);

                      setThemeStudio(prev => ({
                        ...prev,
                        themes: {
                          ...prev.themes,
                          [currentThemeKey]: {
                            ...prev.themes[currentThemeKey],
                            ...newTokens,
                          },
                        },
                      }));
                    }
                  }}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <Box sx={{ p: 2, bgcolor: theme.palette.action.hover, borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Preview: This color will be applied to {configuringColorKey === 'headerBg' ? 'the table header background' :
                              configuringColorKey === 'headerText' ? 'the table header text' :
                              configuringColorKey === 'rowOddBg' ? 'odd-numbered table rows' :
                              configuringColorKey === 'rowEvenBg' ? 'even-numbered table rows' :
                              configuringColorKey === 'border' ? 'table borders' :
                              configuringColorKey === 'accent' ? 'accent elements' :
                              'table cell text'}.
                  </Typography>
                </Box>
              </Stack>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setColorConfigDialogOpen(false);
            setConfiguringColorKey(null);
          }}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (configuringColorKey && previewTheme) {
                const currentState = enhancedTableStore.getState();
                const currentThemeKey = currentState.liturgicalTheme;

                if (currentThemeKey) {
                  if (currentState.customThemes && currentState.customThemes[currentThemeKey]) {
                    const updatedThemes = {
                      ...currentState.customThemes,
                      [currentThemeKey]: {
                        ...currentState.customThemes[currentThemeKey],
                        ...previewTheme,
                      },
                    };
                    enhancedTableStore.setCustomThemes(updatedThemes);

                    setThemeStudio(prev => ({
                      ...prev,
                      themes: {
                        ...prev.themes,
                        [currentThemeKey]: {
                          ...prev.themes[currentThemeKey],
                          ...previewTheme,
                        },
                      },
                    }));
                    await saveThemes();
                  } else if (THEME_MAP[currentThemeKey as LiturgicalThemeKey]) {
                    enhancedTableStore.updatePreDefinedTheme(
                      currentThemeKey as LiturgicalThemeKey,
                      previewTheme
                    );
                  }
                }

                setColorConfigDialogOpen(false);
                setConfiguringColorKey(null);
                setPreviewTheme(null);
                setSuccess('Theme color updated successfully!');
              }
            }}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      {/* Footer */}
      <Box sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CircularProgress size={12} /> Live preview loading. Interactions may not be saved
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" onClick={handleCancel} disabled={saving} sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
              onClick={async () => { await saveThemes(); }}
              disabled={saving}
              sx={{ textTransform: 'none' }}
            >
              {saving ? 'Saving...' : 'Save Themes'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
};

export default ThemeStudioTab;
