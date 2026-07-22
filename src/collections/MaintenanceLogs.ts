import type { CollectionConfig } from 'payload'

export const MaintenanceLogs: CollectionConfig = {
  slug: 'maintenance-logs',
  admin: {
    useAsTitle: 'executionId',
    defaultColumns: ['executionId', 'jobName', 'priority', 'status', 'itemsProcessed', 'durationMs', 'executedAt'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'executionId',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'correlationId',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'jobName',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'priority',
      type: 'select',
      required: true,
      defaultValue: 'medium',
      options: [
        { label: 'Critical', value: 'critical' },
        { label: 'High', value: 'high' },
        { label: 'Medium', value: 'medium' },
        { label: 'Low', value: 'low' },
      ],
    },
    {
      name: 'startedBy',
      type: 'select',
      required: true,
      defaultValue: 'scheduler',
      options: [
        { label: 'Scheduler', value: 'scheduler' },
        { label: 'Manual Admin', value: 'manual_admin' },
        { label: 'API', value: 'api' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'running',
      options: [
        { label: 'Running', value: 'running' },
        { label: 'Success', value: 'success' },
        { label: 'Failed', value: 'failed' },
        { label: 'Partial Success', value: 'partial_success' },
      ],
    },
    {
      name: 'itemsProcessed',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'itemsFailed',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'durationMs',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'jobVersion',
      type: 'text',
      defaultValue: '1.0.0',
    },
    {
      name: 'engineVersion',
      type: 'text',
      defaultValue: '1.0.0',
    },
    {
      name: 'errorDetails',
      type: 'text',
    },
    {
      name: 'executedAt',
      type: 'date',
      required: true,
    },
  ],
  timestamps: true,
}
