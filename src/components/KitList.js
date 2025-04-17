/** @format */

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  TextField,
  Button,
  IconButton,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  FormControl,
  InputLabel,
  Alert,
  Paper,
  Grid,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Search as SearchIcon,
  BuildCircle as BuildIcon,
  Warning as WarningIcon,
  Business as BusinessIcon,
  Send as SendIcon,
  AssignmentReturn as CollectIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import moment from "moment";
import { kitService, distributorService } from "../services/api";

function KitList() {
  const [searchKitId, setSearchKitId] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [selectedDistributors, setSelectedDistributors] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedKit, setSelectedKit] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorTimeout, setErrorTimeout] = useState(null);
  const [successTimeout, setSuccessTimeout] = useState(null);

  // Selection and distribute states
  const [selectedKits, setSelectedKits] = useState([]);
  const [distributeDialog, setDistributeDialog] = useState(false);
  const [selectedDistributor, setSelectedDistributor] = useState("");
  const [distributeDate, setDistributeDate] = useState(moment());
  const [distributors, setDistributors] = useState([]);
  const [distributorLoading, setDistributorLoading] = useState(false);

  // Collection states
  const [collectDialog, setCollectDialog] = useState(false);
  const [collectKits, setCollectKits] = useState([]);
  const [collectDate, setCollectDate] = useState(moment());

  // Clear timeout when component unmounts
  useEffect(() => {
    return () => {
      if (errorTimeout) {
        clearTimeout(errorTimeout);
      }
      if (successTimeout) {
        clearTimeout(successTimeout);
      }
    };
  }, [errorTimeout, successTimeout]);

  // Load initial data
  useEffect(() => {
    fetchKits();
    fetchDistributors();
  }, []);

  const fetchKits = async () => {
    try {
      setLoading(true);
      const data = await kitService.getAllKits();
      console.log("fetch all Kits:", data);

      // Ensure each kit has a unique ID with consistent format
      const processedData = data.map((kit) => ({
        ...kit,
        id: String(kit.id),
      }));

      // Filter kits to only include Available, In-use, and Used status
      const filteredKits = processedData.filter(
        (kit) =>
          kit.status.toLowerCase() === "available" ||
          kit.status.toLowerCase() === "in-use" ||
          kit.status.toLowerCase() === "used"
      );
      console.log("Filtered Kits:", filteredKits);

      // Set filtered data
      setFilteredData(filteredKits);
    } catch (error) {
      console.error("Error fetching kits:", error);
      setErrorWithTimeout(error.message || "Failed to fetch kits");
    } finally {
      setLoading(false);
    }
  };

  const fetchDistributors = async () => {
    try {
      const data = await distributorService.getAllDistributors();
      // Filter distributors to only include active ones
      const activeDistributors = data.filter(
        (distributor) => distributor.status === "active"
      );
      setDistributors(activeDistributors);
    } catch (error) {
      setErrorWithTimeout(error.message || "Failed to fetch distributors");
    }
  };

  // Available status options for dropdown
  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "available", label: "Available" },
    { value: "in-use", label: "In-use" },
    { value: "used", label: "Used" },
  ];

  const handleSearch = async () => {
    try {
      setLoading(true);
      setError(null);

      let results = [];

      // Apply filters based on selected criteria
      if (startDate || endDate) {
        results = await kitService.getKitsByDateRange(
          startDate?.format("YYYY-MM-DD"),
          endDate?.format("YYYY-MM-DD")
        );
      } else if (searchStatus) {
        results = await kitService.getKitsByStatus(searchStatus);
      } else if (selectedDistributors.length > 0) {
        results = await kitService.getKitsByDistributorIds(
          selectedDistributors
        );
      } else {
        results = await kitService.getAllKits();
      }

      results = results.map((kit) => ({
        ...kit,
        id: String(kit.id),
      }));

      // Apply local filtering for Kit ID if provided
      if (searchKitId) {
        results = results.filter((kit) =>
          kit.id.toLowerCase().includes(searchKitId.toLowerCase())
        );
      }

      // Filter kits to only include Available, In-use, and Used status
      results = results.filter(
        (kit) =>
          kit.status.toLowerCase() === "available" ||
          kit.status.toLowerCase() === "in-use" ||
          kit.status.toLowerCase() === "used"
      );

      setFilteredData(results);
    } catch (error) {
      setErrorWithTimeout(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDistributeDialogOpen = () => {
    console.log("Selected kits for distribution:", selectedKits);

    if (!selectedKits || selectedKits.length === 0) {
      setErrorWithTimeout("Please select at least one kit to distribute");
      return;
    }

    // Ensure all selected kits exist in the data
    const validKitIds = selectedKits.filter((kitId) =>
      filteredData.some((kit) => String(kit.id) === String(kitId))
    );

    if (validKitIds.length === 0) {
      setErrorWithTimeout("No valid kits selected");
      return;
    }

    const availableKits = validKitIds.filter((kitId) => {
      const kit = filteredData.find((k) => String(k.id) === String(kitId));
      return kit && (kit.status === "Available" || kit.status === "available");
    });

    if (availableKits.length !== validKitIds.length) {
      setErrorWithTimeout(
        "Only Available kits can be distributed. Please deselect unavailable kits."
      );
      return;
    }

    setDistributeDialog(true);
  };

  const handleDistribute = async () => {
    if (!selectedDistributor) {
      setErrorWithTimeout("Please select a distributor");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const kitIdsToDistribute = selectedKits.map((id) => String(id));

      // Verify all selected kits are in Available status
      const allAvailable = kitIdsToDistribute.every((kitId) => {
        const kit = filteredData.find((k) => String(k.id) === String(kitId));
        return (
          kit && (kit.status === "Available" || kit.status === "available")
        );
      });

      if (!allAvailable) {
        setErrorWithTimeout(
          "Some selected kits are not in Available status. Distribution canceled."
        );
        setLoading(false);
        return;
      }

      // Format the date to ISO 8601 format if provided
      let formattedDate = undefined;
      if (distributeDate) {
        formattedDate = distributeDate.toISOString();
      }

      // Create request data object matching backend API requirements
      const requestData = {
        kits: kitIdsToDistribute,
        distributor_id: selectedDistributor,
        start_time: formattedDate,
      };

      const result = await kitService.distributeKits(requestData);

      if (result && result.message) {
        setSuccessMessageWithTimeout(
          result.message || "Kits distributed successfully"
        );
        setSelectedKits([]);
        setSelectedDistributor("");
        setDistributeDialog(false);

        // Refresh kits list
        await fetchKits();
      } else {
        setErrorWithTimeout(
          "Distribution completed but no confirmation message received"
        );
      }
    } catch (error) {
      if (error.response?.data?.message) {
        setErrorWithTimeout(error.response.data.message);
      } else {
        setErrorWithTimeout(error.message || "Failed to distribute kits");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCollectDialogOpen = (kit) => {
    // Check if kit status allows collection
    if (kit.status !== "In-use") {
      setErrorWithTimeout(
        `Kit ${kit.id} cannot be collected. Only In-use kits can be collected.`
      );
      return;
    }

    setCollectKits([kit.id]);
    setCollectDialog(true);
  };

  const handleCollect = async () => {
    try {
      setLoading(true);
      setError(null);

      // Verify again if all selected kits are in a collectable state
      const allInUse = collectKits.every((kitId) => {
        const kit = filteredData.find((k) => String(k.id) === String(kitId));
        return kit && kit.status === "In-use";
      });

      if (!allInUse) {
        setErrorWithTimeout(
          "Some selected kits are not in In-use status. Collection canceled."
        );
        setLoading(false);
        return;
      }

      // Format the date to ISO 8601 format
      const formattedDate = collectDate.toISOString();
      console.log("Preparing to collect kits:", {
        kits: collectKits,
        endTime: formattedDate,
      });

      // Create request data object matching backend API requirements
      const requestData = {
        kits: collectKits,
        endTime: formattedDate,
      };

      const result = await kitService.collectKits(requestData);
      console.log("Collection result:", result);

      if (result && result.message) {
        setSuccessMessageWithTimeout(
          result.message || "Kits collected successfully"
        );
        setCollectKits([]);
        setCollectDialog(false);

        // Refresh kits list
        await fetchKits();
      } else {
        setErrorWithTimeout(
          "Collection completed but no confirmation message received"
        );
      }
    } catch (error) {
      console.error("Error when collecting kits:", error);
      // Handle specific error messages from backend
      if (error.response?.data?.message) {
        setErrorWithTimeout(error.response.data.message);
      } else {
        setErrorWithTimeout(error.message || "Failed to collect kits");
      }
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { field: "id", headerName: "Kit ID", flex: 1 },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      renderCell: (params) => (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            color:
              params.value === "Available" || params.value === "available"
                ? "success.main"
                : params.value === "Bound" || params.value === "In-use"
                ? "info.main"
                : params.value === "Used"
                ? "secondary.main"
                : params.value === "Unavailable"
                ? "warning.main"
                : "error.main",
          }}
        >
          {params.value === "Available" || params.value === "available" ? (
            <BuildIcon sx={{ mr: 1 }} />
          ) : params.value === "Bound" || params.value === "In-use" ? (
            <BusinessIcon sx={{ mr: 1 }} />
          ) : params.value === "Used" ? (
            <CollectIcon sx={{ mr: 1 }} />
          ) : (
            <WarningIcon sx={{ mr: 1 }} />
          )}
          {params.value}
        </Box>
      ),
    },
    {
      field: "distributor_name",
      headerName: "Distributor",
      flex: 1,
      renderCell: (params) => {
        console.log("Rendering distributor information:", params.row);

        // Check multiple possible field names
        if (
          params.row.status === "Bound" ||
          params.row.status === "In-use" ||
          params.row.status === "Used"
        ) {
          // First try distributor_name, if empty then try the name property of the distributor object
          // If neither exists, try the distributor field (it might be a direct string)
          const distributorValue =
            params.row.distributor_name ||
            (params.row.distributor &&
            typeof params.row.distributor === "object"
              ? params.row.distributor.name
              : params.row.distributor);

          // Add marker for "Used" status
          if (params.row.status === "Used" && distributorValue) {
            return (
              <Box sx={{ display: "flex", alignItems: "center", opacity: 0.7 }}>
                <span>{distributorValue}</span>
                <span style={{ marginLeft: "4px", fontSize: "0.75rem" }}>
                  (Collection completed)
                </span>
              </Box>
            );
          }

          return distributorValue || "-";
        }
        return "-";
      },
    },
    {
      field: "created_at",
      headerName: "Create Time",
      flex: 1,
      valueFormatter: (params) => {
        if (!params) return "-";
        try {
          return moment(params).format("YYYY-MM-DD HH:mm:ss");
        } catch (error) {
          console.error("Date parsing error:", error);
          return params.value;
        }
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      renderCell: (params) => {
        const isAvailable =
          params.row.status === "Available" ||
          params.row.status === "available";

        const isInUse = params.row.status === "In-use";

        const isUsed = params.row.status === "Used";

        // Unify button style and size
        const buttonStyle = { minWidth: "110px" };

        if (isAvailable || isUsed) {
          return (
            <Button
              variant="contained"
              color="secondary"
              size="small"
              onClick={() => handleDissemble(params.row)}
              startIcon={<BuildIcon />}
              sx={buttonStyle}
            >
              Dissemble
            </Button>
          );
        } else if (isInUse) {
          return (
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={() => handleCollectDialogOpen(params.row)}
              startIcon={<CollectIcon />}
              sx={buttonStyle}
            >
              Collect
            </Button>
          );
        }

        return null;
      },
    },
  ];

  const handleDissemble = (kit) => {
    if (
      kit.status !== "Available" &&
      kit.status !== "available" &&
      kit.status !== "Used"
    ) {
      setErrorWithTimeout(
        `Kit ${kit.id} cannot be dissembled. Only Available and Used kits can be dissembled.`
      );
      return;
    }

    setSelectedKit(kit);
    setConfirmDialog(true);
  };

  const confirmDissemble = async () => {
    try {
      setLoading(true);

      // Handle batch disassembly
      if (selectedKit?.batchDissemble && selectedKit.batchIds?.length > 0) {
        // Verify all kit statuses one final time
        const invalidKits = selectedKit.batchIds.filter((kitId) => {
          const kit = filteredData.find((k) => String(k.id) === String(kitId));
          return (
            !kit ||
            (kit.status !== "Available" &&
              kit.status !== "available" &&
              kit.status !== "Used")
          );
        });

        if (invalidKits.length > 0) {
          setErrorWithTimeout(
            `Some selected kits (${invalidKits.length}) are not in valid status for dissembling.`
          );
          setLoading(false);
          setConfirmDialog(false);
          setSelectedKit(null);
          return;
        }

        // Prepare request data for batch disassembly
        const requestData = {
          kit_IDs: selectedKit.batchIds.map((id) => String(id)),
        };

        const result = await kitService.disassembleKits(requestData);

        if (result.message === "Batch disassemble completed") {
          if (result.failed_kits && result.failed_kits.length > 0) {
            setErrorWithTimeout(
              `Some kits failed to disassemble: ${result.failed_kits
                .map((f) => f.kit_ID)
                .join(", ")}`
            );
          } else {
            setSuccessMessageWithTimeout(
              `Successfully disassembled ${selectedKit.batchIds.length} kit${
                selectedKit.batchIds.length !== 1 ? "s" : ""
              }`
            );
          }
        }
      }
      // Handle single disassembly
      else {
        // Prepare request data for single disassembly
        const requestData = {
          kit_ID: String(selectedKit.id),
        };

        const result = await kitService.disassembleKit(requestData);

        if (result.message === "Kit disassembled successfully") {
          setSuccessMessageWithTimeout("Kit disassembled successfully");
        }
      }

      // Refresh the kit list
      fetchKits();
    } catch (error) {
      if (error.response?.data?.message) {
        setErrorWithTimeout(error.response.data.message);
      } else {
        setErrorWithTimeout(error.message || "Failed to disassemble kit(s)");
      }
    } finally {
      setLoading(false);
      setConfirmDialog(false);
      setSelectedKit(null);
    }
  };

  const setErrorWithTimeout = (errorMessage) => {
    // Clear existing timeout
    if (errorTimeout) {
      clearTimeout(errorTimeout);
    }

    // Set error message
    setError(errorMessage);

    // Set new timeout to clear error after 5 seconds
    const timeout = setTimeout(() => {
      setError(null);
    }, 5000);

    setErrorTimeout(timeout);
  };

  const setSuccessMessageWithTimeout = (message) => {
    // Clear existing timeout
    if (successTimeout) {
      clearTimeout(successTimeout);
    }

    // Set success message
    setSuccessMessage(message);

    // Set new timeout to clear success message after 5 seconds
    const timeout = setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);

    setSuccessTimeout(timeout);
  };

  const handleClearFilters = () => {
    setSearchKitId("");
    setSearchStatus("");
    setSelectedDistributors([]);
    setStartDate(null);
    setEndDate(null);
    fetchKits();
  };

  return (
    <LocalizationProvider dateAdapter={AdapterMoment}>
      <Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
          <Typography variant="h4">Kit Management</Typography>
        </Box>

        <Card sx={{ p: 2, mb: 3 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems="flex-start"
          >
            <TextField
              label="Search Kit ID"
              variant="outlined"
              size="small"
              value={searchKitId}
              onChange={(e) => setSearchKitId(e.target.value)}
              InputProps={{
                endAdornment: <SearchIcon color="action" />,
              }}
            />
            <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={searchStatus}
                onChange={(e) => setSearchStatus(e.target.value)}
                label="Status"
              >
                {statusOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel>Distributor</InputLabel>
              <Select
                multiple
                value={selectedDistributors}
                onChange={(e) => setSelectedDistributors(e.target.value)}
                input={<OutlinedInput label="Distributor" />}
                renderValue={(selected) =>
                  selected
                    .map((id) => distributors.find((d) => d.id === id)?.name)
                    .join(", ")
                }
              >
                {distributors.map((distributor) => (
                  <MenuItem key={distributor.id} value={distributor.id}>
                    <Checkbox
                      checked={
                        selectedDistributors.indexOf(distributor.id) > -1
                      }
                    />
                    <ListItemText primary={distributor.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={setStartDate}
              slotProps={{ textField: { size: "small" } }}
            />
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={setEndDate}
              slotProps={{ textField: { size: "small" } }}
            />
            <Button
              variant="contained"
              onClick={handleSearch}
              startIcon={<SearchIcon />}
              sx={{ height: 40 }}
            >
              Search
            </Button>
            <Button
              variant="outlined"
              onClick={handleClearFilters}
              startIcon={<ClearIcon />}
              sx={{ height: 40 }}
            >
              Clear
            </Button>
          </Stack>
        </Card>

        {/* Action buttons toolbar */}
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SendIcon />}
              onClick={handleDistributeDialogOpen}
              disabled={selectedKits.length === 0}
            >
              Distribute Kits
            </Button>

            {/* Batch collect button */}
            <Button
              variant="contained"
              color="secondary"
              startIcon={<CollectIcon />}
              onClick={() => {
                // Filter out kits with In-use status
                const inUseKits = selectedKits.filter((kitId) => {
                  const kit = filteredData.find(
                    (k) => String(k.id) === String(kitId)
                  );
                  return kit && kit.status === "In-use";
                });

                // If no In-use kits are selected
                if (inUseKits.length === 0) {
                  setErrorWithTimeout(
                    "Please select at least one In-use kit to collect"
                  );
                  return;
                }

                // Check if any kits with invalid status are selected
                if (inUseKits.length !== selectedKits.length) {
                  setErrorWithTimeout(
                    "Only In-use kits can be collected. Please deselect other kits."
                  );
                  return;
                }

                setCollectKits(inUseKits);
                setCollectDialog(true);
              }}
              disabled={selectedKits.length === 0}
            >
              Collect Selected Kits
            </Button>

            {/* Batch dissemble button */}
            <Button
              variant="contained"
              color="error"
              startIcon={<BuildIcon />}
              onClick={() => {
                // Filter out kits that can be disassembled (Available or Used)
                const dissembleKits = selectedKits.filter((kitId) => {
                  const kit = filteredData.find(
                    (k) => String(k.id) === String(kitId)
                  );
                  return (
                    kit &&
                    (kit.status === "Used" ||
                      kit.status === "Available" ||
                      kit.status === "available")
                  );
                });

                if (dissembleKits.length === 0) {
                  setErrorWithTimeout(
                    "Please select at least one Used or Available kit to dissemble"
                  );
                  return;
                }

                // Check if any kits with invalid status are selected
                if (dissembleKits.length !== selectedKits.length) {
                  setErrorWithTimeout(
                    "Only Available and Used kits can be dissembled. Please deselect other kits."
                  );
                  return;
                }

                // Create confirmation dialog text
                const confirmMessage = `Are you sure you want to dissemble ${
                  dissembleKits.length
                } kit${dissembleKits.length !== 1 ? "s" : ""}?`;

                // Set kits to be disassembled
                setSelectedKit({
                  id: dissembleKits[0],
                  batchDissemble: true,
                  batchIds: dissembleKits,
                  confirmMessage,
                });

                setConfirmDialog(true);
              }}
              disabled={selectedKits.length === 0}
            >
              Dissemble Selected Kits
            </Button>
          </Box>

          {selectedKits.length > 0 && (
            <Typography variant="body2" sx={{ alignSelf: "center" }}>
              {selectedKits.length} kit{selectedKits.length !== 1 ? "s" : ""}{" "}
              selected
            </Typography>
          )}
        </Box>

        <Card sx={{ height: 400, width: "100%" }}>
          <DataGrid
            rows={filteredData}
            columns={columns}
            pageSize={5}
            rowsPerPageOptions={[5, 10, 25]}
            checkboxSelection
            disableSelectionOnClick
            loading={loading}
            onRowSelectionModelChange={(newSelection) => {
              console.log("Selection changed:", newSelection);
              setSelectedKits(newSelection);
            }}
            rowSelectionModel={selectedKits}
            isRowSelectable={(params) => {
              return (
                params.row.status === "Available" ||
                params.row.status === "available" ||
                params.row.status === "In-use" ||
                params.row.status === "Used"
              );
            }}
            sx={{
              "& .MuiDataGrid-cell:focus": {
                outline: "none",
              },
            }}
          />
        </Card>

        {error && (
          <Alert
            severity="error"
            sx={{ mt: 2 }}
            onClose={() => {
              setError(null);
              if (errorTimeout) {
                clearTimeout(errorTimeout);
                setErrorTimeout(null);
              }
            }}
          >
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert
            severity="success"
            sx={{ mt: 2 }}
            onClose={() => {
              setSuccessMessage(null);
              if (successTimeout) {
                clearTimeout(successTimeout);
                setSuccessTimeout(null);
              }
            }}
          >
            {successMessage}
          </Alert>
        )}

        {/* Dialogs */}
        <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
          <DialogTitle>Confirm Dissemble</DialogTitle>
          <DialogContent>
            {selectedKit?.batchDissemble
              ? selectedKit.confirmMessage
              : `Are you sure you want to dissemble Kit ${selectedKit?.id}?`}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialog(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={confirmDissemble}
              variant="contained"
              color="secondary"
              disabled={loading}
            >
              {loading ? "Processing..." : "Confirm"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={distributeDialog}
          onClose={() => !loading && setDistributeDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Distribute Kits</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, pb: 1 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                You are about to distribute {selectedKits.length} kit
                {selectedKits.length !== 1 ? "s" : ""}.
              </Typography>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="distributor-label">Distributor</InputLabel>
                <Select
                  labelId="distributor-label"
                  value={selectedDistributor}
                  onChange={(e) => setSelectedDistributor(e.target.value)}
                  label="Distributor"
                  disabled={loading || distributorLoading}
                >
                  {distributors.map((distributor) => (
                    <MenuItem key={distributor.id} value={distributor.id}>
                      {distributor.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <DatePicker
                label="Distribute Date (optional)"
                value={distributeDate}
                onChange={setDistributeDate}
                disabled={loading}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    helperText:
                      "If not specified, current date and time will be used",
                  },
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setDistributeDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDistribute}
              variant="contained"
              color="primary"
              disabled={loading || !selectedDistributor}
            >
              {loading ? "Processing..." : "Distribute"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Collect Dialog */}
        <Dialog
          open={collectDialog}
          onClose={() => !loading && setCollectDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Collect Kits</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, pb: 1 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                You are about to collect {collectKits.length} kit
                {collectKits.length !== 1 ? "s" : ""} from the distributor.
              </Typography>

              <DatePicker
                label="Collection Date (End Time)"
                value={collectDate}
                onChange={setCollectDate}
                disabled={loading}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    helperText:
                      "If not specified, current date and time will be used",
                  },
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCollectDialog(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleCollect}
              variant="contained"
              color="primary"
              disabled={loading}
            >
              {loading ? "Processing..." : "Collect"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}

export default KitList;
