// controllers/admin/sync.js
const { 
    syncAllMunicipalProperties,
    indexMunicipalProperty,
    updateMunicipalProperty,
    deleteMunicipalProperty
  } = require('../../services/elasticsearch');
  const prisma = require('../../config/database');
  
  /**
   * Trigger a full synchronization of municipal properties
   */
  exports.syncMunicipalProperties = async (req, res) => {
    try {
      const batchSize = parseInt(req.body.batchSize) || 1000;
      
      // Don't await the full sync - it might take a long time
      // Instead, start it and return a response immediately
      const syncPromise = syncAllMunicipalProperties(batchSize)
        .then(result => {
          console.log(`Sync completed. Processed ${result.count} properties.`);
          if (result.failedProperties && result.failedProperties.length > 0) {
            console.log(`Failed to process ${result.failedProperties.length} properties.`);
          }
        })
        .catch(error => {
          console.error('Sync process failed:', error);
        });
      
      // Return immediate response
      return res.status(200).json({
        success: true,
        message: `Municipal properties sync started with batch size ${batchSize}`,
        isAsync: true
      });
    } catch (error) {
      console.error('Error starting sync process:', error);
      return res.status(500).json({ 
        error: 'Failed to start sync process',
        details: error.message
      });
    }
  };
  
  /**
   * Get status of the current or last sync operation
   * Note: This would require implementing a way to track sync operations
   */
  exports.getSyncStatus = async (req, res) => {
    // This is a placeholder - a real implementation would track sync jobs
    return res.status(200).json({
      message: 'Sync status tracking not implemented yet',
      isImplemented: false
    });
  };
  
  /**
   * Sync a single municipal property
   */
  exports.syncSingleProperty = async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Missing property ID' });
      }
      
      // Fetch property with related data
      const property = await prisma.municipalProperty.findUnique({
        where: { id },
        include: {
          zone: true,
          properties: {
            select: {
              id: true,
              status: true
            }
          }
        }
      });
      
      if (!property) {
        return res.status(404).json({ error: 'Property not found' });
      }
      
      // Index the property
      const result = await indexMunicipalProperty(property);
      
      return res.status(200).json({
        success: true,
        message: `Property ${id} synchronized successfully`,
        data: result
      });
    } catch (error) {
      console.error(`Error syncing property ${req.params.id}:`, error);
      return res.status(500).json({ 
        error: 'Failed to sync property',
        details: error.message
      });
    }
  };
  
  /**
   * Delete a municipal property from the index
   */
  exports.deletePropertyFromIndex = async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Missing property ID' });
      }
      
      // Delete from Elasticsearch
      const result = await deleteMunicipalProperty(id);
      
      return res.status(200).json({
        success: true,
        message: `Property ${id} deleted from index`,
        data: result
      });
    } catch (error) {
      console.error(`Error deleting property ${req.params.id} from index:`, error);
      return res.status(500).json({ 
        error: 'Failed to delete property from index',
        details: error.message
      });
    }
  };