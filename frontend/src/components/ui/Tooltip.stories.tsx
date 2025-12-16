import type { Meta, StoryObj } from '@storybook/react'
import { Tooltip, TooltipText, InfoTooltip, TruncatedText, CopyTooltip } from './Tooltip'
import { Button } from './button'
import { Info, HelpCircle, Settings } from 'lucide-react'

const meta: Meta<typeof Tooltip> = {
  title: 'UI/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    position: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right'],
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    content: 'This is a tooltip',
    children: <Button>Hover me</Button>,
  },
}

export const Positions: Story = {
  render: () => (
    <div className="flex gap-8 p-16">
      <Tooltip content="Tooltip on top" position="top">
        <Button variant="outline">Top</Button>
      </Tooltip>
      <Tooltip content="Tooltip on bottom" position="bottom">
        <Button variant="outline">Bottom</Button>
      </Tooltip>
      <Tooltip content="Tooltip on left" position="left">
        <Button variant="outline">Left</Button>
      </Tooltip>
      <Tooltip content="Tooltip on right" position="right">
        <Button variant="outline">Right</Button>
      </Tooltip>
    </div>
  ),
}

export const TextTooltip: Story = {
  render: () => (
    <div className="space-y-4">
      <p>
        Hover over the{' '}
        <TooltipText text="This is additional information about the term">
          <span className="text-indigo-600 underline cursor-help">technical term</span>
        </TooltipText>{' '}
        to see more details.
      </p>
    </div>
  ),
}

export const InfoTooltips: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span>Machine Status</span>
        <InfoTooltip content="The current operational status of the vending machine." />
      </div>
      <div className="flex items-center gap-2">
        <span>Stock Level</span>
        <InfoTooltip content="Percentage of products remaining in the machine. Low stock is indicated when below 20%." />
      </div>
      <div className="flex items-center gap-2">
        <span>Last Collection</span>
        <InfoTooltip content="Date and time when cash was last collected from the machine." />
      </div>
    </div>
  ),
}

export const TruncatedTextExample: Story = {
  render: () => (
    <div className="w-48 space-y-2">
      <TruncatedText
        text="This is a very long text that will be truncated because it exceeds the container width"
        maxLength={40}
      />
      <TruncatedText
        text="Short text"
        maxLength={40}
      />
      <TruncatedText
        text="Another extremely long piece of text that definitely needs truncation to fit properly"
        maxLength={40}
      />
    </div>
  ),
}

export const CopyTooltipExample: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span>Machine ID:</span>
        <CopyTooltip text="vm-123456-abcdef" />
      </div>
      <div className="flex items-center gap-2">
        <span>API Key:</span>
        <CopyTooltip text="sk_live_abc123xyz789" />
      </div>
    </div>
  ),
}

export const IconButtonsWithTooltips: Story = {
  render: () => (
    <div className="flex gap-2">
      <Tooltip content="Settings">
        <Button size="icon" variant="ghost">
          <Settings className="h-4 w-4" />
        </Button>
      </Tooltip>
      <Tooltip content="Help">
        <Button size="icon" variant="ghost">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </Tooltip>
      <Tooltip content="Information">
        <Button size="icon" variant="ghost">
          <Info className="h-4 w-4" />
        </Button>
      </Tooltip>
    </div>
  ),
}

export const RichContent: Story = {
  render: () => (
    <Tooltip
      content={
        <div className="space-y-1">
          <p className="font-medium">Machine Details</p>
          <p className="text-xs text-gray-400">Status: Active</p>
          <p className="text-xs text-gray-400">Stock: 85%</p>
          <p className="text-xs text-gray-400">Last Visit: 2 hours ago</p>
        </div>
      }
    >
      <Button variant="outline">Hover for details</Button>
    </Tooltip>
  ),
}

export const FormFieldHelp: Story = {
  render: () => (
    <div className="w-80 space-y-4">
      <div>
        <div className="flex items-center gap-1 mb-1">
          <label className="text-sm font-medium">Machine Number</label>
          <InfoTooltip content="Unique identifier for the machine. Must start with 'VM-' followed by numbers." />
        </div>
        <input
          type="text"
          className="w-full px-3 py-2 border rounded-md"
          placeholder="VM-001"
        />
      </div>
      <div>
        <div className="flex items-center gap-1 mb-1">
          <label className="text-sm font-medium">Low Stock Threshold</label>
          <InfoTooltip content="Percentage at which the system will alert for low stock. Default is 20%." />
        </div>
        <input
          type="number"
          className="w-full px-3 py-2 border rounded-md"
          placeholder="20"
        />
      </div>
    </div>
  ),
}
