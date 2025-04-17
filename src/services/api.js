/** @format */

import axios from "axios";

const BASE_URL = "http://127.0.0.1:5000/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const kitService = {
  // Get all kits
  getAllKits: async () => {
    try {
      const response = await api.get("/kits/getAll");
      return response.data.map((kit) => ({
        ...kit,
        // Process distributor information: priority is distributor_name > distributor.name > distributor (string)
        distributor_name:
          kit.distributor_name ||
          (kit.distributor && typeof kit.distributor === "object"
            ? kit.distributor.name
            : kit.distributor),
        // Ensure all date fields have values or are null
        created_at: kit.created_at || null,
        // Handle possible different date field names
        dispense_date: kit.dispense_date || kit.start_time || null,
        // Ensure consistent case for status field
        status: kit.status || "Unknown",
        // Map all components
        components: {
          phone: kit.phone || null,
          sim_card: kit.sim_card || null,
          right_sensor: kit.right_sensor || null,
          left_sensor: kit.left_sensor || null,
          headphone: kit.headphone || null,
          box: kit.box || null,
        },
      }));
    } catch (error) {
      throw kitService.handleError(error);
    }
  },

  // Get kit by ID
  getKitById: async (kitId) => {
    try {
      const response = await api.get(`/kits/${kitId}`);
      return response.data;
    } catch (error) {
      throw kitService.handleError(error);
    }
  },

  // Get kits by date range
  getKitsByDateRange: async (startDate, endDate) => {
    try {
      const response = await api.get("/kits/filterByCreatedAtRange", {
        params: {
          startDate,
          endDate,
        },
      });
      return response.data;
    } catch (error) {
      throw kitService.handleError(error);
    }
  },

  // Get kits by status
  getKitsByStatus: async (status) => {
    try {
      const response = await api.get("/kits/filterByStatus", {
        params: { status },
      });
      return response.data;
    } catch (error) {
      throw kitService.handleError(error);
    }
  },

  // Get kits by distributor IDs
  getKitsByDistributorIds: async (distributorIds) => {
    try {
      const promises = distributorIds.map((id) =>
        api.get("/kits/filterByDistributorId", {
          params: { distributorId: id },
        })
      );
      const responses = await Promise.all(promises);
      return responses.flatMap((response) => response.data);
    } catch (error) {
      throw kitService.handleError(error);
    }
  },

  // Create a new kit
  createKit: async (components) => {
    try {
      // Prepare request data matching backend API requirements
      const requestData = {
        phone_ID: components.phone?.id,
        SIM_card_ID: components.simCard?.id,
        right_sensor_ID: components.rightSensor?.id,
        left_sensor_ID: components.leftSensor?.id,
        headphones_ID: components.headphone?.id,
        box_ID: components.box?.id,
      };

      console.log("Sending create kit request:", requestData);
      const response = await api.post("/kits/create", requestData);
      console.log("Create kit response:", response.data);

      return response.data;
    } catch (error) {
      console.error("Error creating kit:", error.response?.data || error);

      if (error.response?.data) {
        // Handle specific error cases
        if (error.response.data.unavailable_components) {
          throw {
            message:
              error.response.data.message ||
              "Some components are not available",
            details: error.response.data.unavailable_components,
            response: error.response,
          };
        }

        throw {
          message: error.response.data.message || "Failed to create kit",
          details: error.response.data.details || error.response.data,
          response: error.response,
        };
      }

      throw {
        message: "Failed to create kit",
        details: error.message,
      };
    }
  },

  // Disassemble a kit
  disassembleKit: async (data) => {
    try {
      const response = await api.post("/kits/disassemble", data);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw {
          message: error.response.data.message || "Failed to disassemble kit",
          response: error.response,
        };
      }
      throw error;
    }
  },

  // Batch disassemble kits
  disassembleKits: async (data) => {
    try {
      const response = await api.post("/kits/disassemble_many", data);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw {
          message:
            error.response.data.message || "Failed to batch disassemble kits",
          response: error.response,
        };
      }
      throw error;
    }
  },

  // Change kit status
  changeKitStatus: async (kitId, status) => {
    try {
      const response = await api.post("/kits/satus_change", {
        kit_id: kitId,
        status: status,
      });
      return response.data;
    } catch (error) {
      throw kitService.handleError(error);
    }
  },

  // Get all components
  getAllComponents: async () => {
    try {
      const response = await api.get("/components");
      // Convert the component type to a format used by the frontend
      const typeMapping = {
        Phone: "phone",
        SimCard: "simCard",
        RightSensor: "rightSensor",
        LeftSensor: "leftSensor",
        Headphone: "headphone",
      };

      return response.data.components.map((component) => ({
        ...component,
        type: typeMapping[component.type] || component.type.toLowerCase(),
        //Ensure the date field format is correct
        created_at: component.created_at || null,
        discarded_at: component.discarded_at || null,
      }));
    } catch (error) {
      throw kitService.handleError(error);
    }
  },

  // Create components by batch
  createComponentsByBatch: async (componentType, data) => {
    try {
      const response = await api.post(`/${componentType}/createByBatch`, data);
      return response.data;
    } catch (error) {
      throw kitService.handleError(error);
    }
  },

  // Get components by batch number
  getComponentsByBatchNumber: async (batchNumber) => {
    try {
      const response = await api.get(`/components/batch_query/${batchNumber}`);
      // Format component types to match frontend conventions
      const typeMapping = {
        Phone: "phone",
        SimCard: "simCard",
        RightSensor: "rightSensor",
        LeftSensor: "leftSensor",
        Headphone: "headphone",
        Box: "box",
      };

      return {
        ...response.data,
        components: response.data.components.map((component) => ({
          ...component,
          type: typeMapping[component.type] || component.type.toLowerCase(),
        })),
      };
    } catch (error) {
      throw kitService.handleError(error);
    }
  },

  // Get component usage history
  getComponentUsageHistory: async (componentId) => {
    try {
      const response = await api.get(`/usage/component/${componentId}`);

      // Get all distributor data
      const distributorsResponse = await api.get("/distributors");
      const distributors = distributorsResponse.data;

      // Create a mapping from distributor ID to name
      const distributorMap = distributors.reduce((map, distributor) => {
        map[distributor.id] = distributor.name;
        return map;
      }, {});

      // Process usage history data, add distributor name
      const processedData = response.data.map((record) => ({
        ...record,
        distributor_name:
          distributorMap[record.distributor_id] || "Unknown Distributor",
      }));

      return processedData;
    } catch (error) {
      throw kitService.handleError(error);
    }
  },

  // Update component status
  updateComponentStatus: async (componentId, status) => {
    try {
      const response = await api.put(
        `/components/status_update/${componentId}`,
        {
          status: status,
        }
      );
      return response.data;
    } catch (error) {
      throw kitService.handleError(error);
    }
  },

  // Distribute kits to a distributor
  distributeKits: async (data) => {
    try {
      // Ensure required fields are present
      if (!data.kits || !Array.isArray(data.kits)) {
        throw new Error("Missing required field: kits");
      }
      if (!data.distributor_id) {
        throw new Error("Missing required field: distributor_id");
      }

      // Format the date to ISO 8601 format if provided
      const requestData = {
        kits: data.kits,
        distributor_id: data.distributor_id,
        start_time: data.distribute_date
          ? data.distribute_date.toISOString()
          : undefined,
      };

      // Send POST request to distribute kits
      const response = await api.post("/kits/distribute", requestData);
      return response.data;
    } catch (error) {
      console.error("Error distributing kits:", error);
      if (error.response) {
        // Handle specific error messages from backend
        throw {
          message: error.response.data.message || "Failed to distribute kits",
          response: error.response,
        };
      }
      throw error;
    }
  },

  // Collect kits from distributor
  collectKits: async (data) => {
    try {
      // Ensure required fields are present
      if (!data.kits || !Array.isArray(data.kits)) {
        throw new Error("Missing required field: kits");
      }

      // Send PATCH request to collect kits
      const response = await api.patch("/kits/collect", data);
      return response.data;
    } catch (error) {
      console.error("Error collecting kits:", error);
      if (error.response) {
        // Handle specific error messages from backend
        throw {
          message: error.response.data.message || "Failed to collect kits",
          response: error.response,
        };
      }
      throw error;
    }
  },

  // Helper method to handle errors
  handleError: (error) => {
    if (error.response) {
      // Server responded with error
      return {
        message: error.response.data.message || "An error occurred",
        details: error.response.data.details,
        status: error.response.status,
      };
    }
    // Network error or other issues
    return {
      message: "Network error occurred",
      details: error.message,
      status: 500,
    };
  },
};

export const distributorService = {
  // Get all distributors
  getAllDistributors: async () => {
    try {
      const response = await api.get("/distributors");
      return response.data;
    } catch (error) {
      throw distributorService.handleError(error);
    }
  },

  // Get distributor by ID
  getDistributorById: async (distributorId) => {
    try {
      const response = await api.get(`/distributors/${distributorId}`);
      return response.data;
    } catch (error) {
      throw distributorService.handleError(error);
    }
  },

  // Create distributor
  createDistributor: async (distributorData) => {
    try {
      const response = await api.post("/distributors/create", distributorData);
      return response.data;
    } catch (error) {
      throw distributorService.handleError(error);
    }
  },

  // Update distributor
  updateDistributor: async (distributorId, distributorData) => {
    try {
      const response = await api.put(
        `/distributors/${distributorId}`,
        distributorData
      );
      return response.data;
    } catch (error) {
      throw distributorService.handleError(error);
    }
  },

  // Update distributor status
  updateDistributorStatus: async (distributorId, status) => {
    try {
      const response = await api.patch(
        `/distributors/${distributorId}/status`,
        { status }
      );
      return response.data;
    } catch (error) {
      throw distributorService.handleError(error);
    }
  },

  // Helper method to handle errors
  handleError: (error) => {
    if (error.response) {
      // Server responded with error
      return {
        message: error.response.data.message || "An error occurred",
        details: error.response.data.details,
        status: error.response.status,
      };
    }
    // Network error or other issues
    return {
      message: "Network error occurred",
      details: error.message,
      status: 500,
    };
  },
};

export const dashboardService = {
  // Get component discard rate data
  getDiscardRate: async (months) => {
    try {
      const response = await api.get("/discard-rate", {
        params: { months },
      });

      return response.data.data;
    } catch (error) {
      console.error("获取废弃率数据失败:", error);
      throw {
        message: "Failed to fetch discard rate data",
        details: error.message,
      };
    }
  },

  // Common method for handling errors
  handleError: (error) => {
    if (error.response) {
      return {
        message: error.response.data.message || "An error occurred",
        details: error.response.data.details,
        status: error.response.status,
      };
    }
    return {
      message: "Network error occurred",
      details: error.message,
      status: 500,
    };
  },
};

export const exportService = {
  // Export database as JSON format
  exportAsJson: async () => {
    try {
      // Use axios directly for request as we need to handle binary data response
      const response = await axios({
        url: `${BASE_URL}/exportdb?format=json`,
        method: "GET",
        responseType: "blob", // Important: indicates response is binary data
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "database_export.json");
      document.body.appendChild(link);
      link.click();
      link.remove();

      return { success: true };
    } catch (error) {
      console.error("导出JSON数据失败:", error);
      throw {
        message: "Failed to export database as JSON",
        details: error.message,
      };
    }
  },

  // Export database as CSV format (compressed archive of multiple CSV files)
  exportAsCsv: async () => {
    try {
      // Use axios directly for request as we need to handle binary data response
      const response = await axios({
        url: `${BASE_URL}/exportdb?format=csv`,
        method: "GET",
        responseType: "blob", // Important: indicates response is binary data
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "database_export.zip");
      document.body.appendChild(link);
      link.click();
      link.remove();

      return { success: true };
    } catch (error) {
      console.error("导出CSV数据失败:", error);
      throw {
        message: "Failed to export database as CSV",
        details: error.message,
      };
    }
  },

  // Import database data
  importData: async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post("/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      console.error("导入数据失败:", error);
      throw {
        message: "Failed to import data",
        details: error.message,
      };
    }
  },

  // Common method for handling errors
  handleError: (error) => {
    if (error.response) {
      return {
        message: error.response.data.message || "An export error occurred",
        details: error.response.data.details,
        status: error.response.status,
      };
    }
    return {
      message: "Network error during export",
      details: error.message,
      status: 500,
    };
  },
};
