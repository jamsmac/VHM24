# AI-Agent System Architecture for Reference Books

## Overview

The AI-Agent system provides intelligent assistance for data entry and validation in reference books (справочники). Each reference book gets its own AI-agent that learns from user confirmations and improves over time.

## Core Concepts

### 1. Agent Structure

Each agent consists of:
- **Agent ID**: Unique identifier tied to a reference book
- **Reference Book Type**: products, suppliers, categories, locations, etc.
- **System Prompt**: Instructions for the agent (editable by admin only)
- **Learning Data**: Historical confirmations and rejections
- **Status**: active, inactive, archived
- **Created/Updated**: Timestamps and user attribution

### 2. Agent Workflow

```
User Input (e.g., product name)
    ↓
Agent analyzes input using system prompt
    ↓
Agent queries project knowledge base
    ↓
Agent generates field suggestions
    ↓
User reviews suggestions
    ↓
User confirms/rejects
    ↓
Agent learns from feedback
    ↓
Agent proposes prompt improvements
    ↓
Admin approves/rejects improvements
```

### 3. Agent Capabilities

**Data Analysis:**
- Parse input names/descriptions
- Extract key information
- Recognize patterns from historical data
- Link to related entities

**Suggestion Generation:**
- Auto-fill structured fields
- Suggest categories/classifications
- Recommend related items
- Validate data consistency

**Learning:**
- Track confirmed suggestions (positive feedback)
- Track rejected suggestions (negative feedback)
- Build confidence scores
- Identify improvement areas

**Self-Improvement:**
- Analyze suggestion accuracy
- Propose prompt modifications
- Suggest new field mappings
- Recommend knowledge base updates

## Database Schema

### agents table
```sql
CREATE TABLE agents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  referenceBookType VARCHAR(50) NOT NULL UNIQUE,
  displayName VARCHAR(255) NOT NULL,
  systemPrompt TEXT NOT NULL,
  status ENUM('active', 'inactive', 'archived') DEFAULT 'active',
  version INT DEFAULT 1,
  createdBy INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedBy INT,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (createdBy) REFERENCES users(id),
  FOREIGN KEY (updatedBy) REFERENCES users(id)
);
```

### agent_suggestions table
```sql
CREATE TABLE agent_suggestions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agentId INT NOT NULL,
  referenceBookId INT,
  inputData JSON NOT NULL,
  suggestedFields JSON NOT NULL,
  confidence DECIMAL(3,2),
  confirmed BOOLEAN,
  confirmedBy INT,
  confirmedAt TIMESTAMP,
  rejectedReason TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agentId) REFERENCES agents(id),
  FOREIGN KEY (confirmedBy) REFERENCES users(id)
);
```

### agent_improvements table
```sql
CREATE TABLE agent_improvements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agentId INT NOT NULL,
  proposedPrompt TEXT NOT NULL,
  proposedChanges JSON NOT NULL,
  reasoning TEXT,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  approvedBy INT,
  approvedAt TIMESTAMP,
  rejectionReason TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agentId) REFERENCES agents(id),
  FOREIGN KEY (approvedBy) REFERENCES users(id)
);
```

### agent_learning_data table
```sql
CREATE TABLE agent_learning_data (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agentId INT NOT NULL,
  fieldName VARCHAR(100),
  inputPattern VARCHAR(255),
  suggestedValue VARCHAR(255),
  confirmationRate DECIMAL(3,2),
  rejectionRate DECIMAL(3,2),
  lastUsed TIMESTAMP,
  FOREIGN KEY (agentId) REFERENCES agents(id)
);
```

## API Endpoints

### Agent Management
- `agents.list` - Get all agents
- `agents.get` - Get agent details
- `agents.create` - Create new agent (admin only)
- `agents.updatePrompt` - Update agent system prompt (admin only)
- `agents.updateStatus` - Change agent status (admin only)

### Suggestions
- `agents.generateSuggestions` - Generate field suggestions for input
- `agents.confirmSuggestion` - Confirm suggestion (user)
- `agents.rejectSuggestion` - Reject suggestion with reason (user)
- `agents.getSuggestionHistory` - Get agent's suggestion history

### Learning & Improvements
- `agents.getImprovements` - Get pending improvement proposals
- `agents.approveImprovement` - Approve prompt improvement (admin only)
- `agents.rejectImprovement` - Reject improvement (admin only)
- `agents.getLearningStats` - Get agent learning statistics

## Default Agent Prompts

### Products Agent
```
You are an AI assistant for the Products reference book. When given a product name or description:
1. Extract the product category from the name (e.g., "Coca Cola" → Beverages)
2. Suggest standard fields: name, category, sku, unit, price
3. Look for similar products in the system to suggest related items
4. Validate that the SKU follows company format
5. Suggest supplier based on product type
6. Recommend reorder quantity based on category
```

### Suppliers Agent
```
You are an AI assistant for the Suppliers reference book. When given a supplier name:
1. Extract company type (manufacturer, distributor, etc.)
2. Identify product categories they likely supply
3. Suggest contact information fields
4. Recommend payment terms based on supplier type
5. Suggest lead time estimates
6. Link to similar suppliers in the system
```

### Categories Agent
```
You are an AI assistant for the Categories reference book. When given a category name:
1. Determine parent category if applicable
2. Suggest similar categories to avoid duplicates
3. Recommend default markup percentage
4. Suggest shelf life for perishables
5. Identify related tax classifications
```

## Integration Points

### Reference Book Pages
- Display agent status indicator
- Show "AI Suggestions" button when creating/editing
- Display confidence scores
- Show suggestion history
- Allow feedback on suggestions

### Admin Panel
- Agent management interface
- Prompt editor with preview
- Improvement approval workflow
- Learning statistics dashboard
- Agent performance metrics

## Security & Permissions

- **Admin Only**: Create/update agents, approve improvements, modify prompts
- **Manager/Operator**: Confirm/reject suggestions, provide feedback
- **All Users**: View agent suggestions, see confidence scores

## Monitoring & Analytics

- Suggestion accuracy rate
- User confirmation rate
- Most common rejections
- Agent improvement proposals
- Learning curve visualization
- Performance trends

## Future Enhancements

1. **Multi-language Support**: Agents for different languages
2. **Custom Fields**: Allow agents to handle custom reference book fields
3. **Integration with External APIs**: Fetch data from suppliers, pricing services
4. **Batch Processing**: Apply suggestions to multiple records
5. **Collaborative Learning**: Share learning between similar agents
6. **A/B Testing**: Test different prompts with user groups
