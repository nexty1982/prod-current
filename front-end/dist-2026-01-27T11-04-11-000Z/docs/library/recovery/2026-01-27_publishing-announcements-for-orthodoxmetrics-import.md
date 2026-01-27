# Publishing Announcements for OrthodoxMetrics Import

This guide explains how to format your church announcements so they can be automatically imported into OrthodoxMetrics.

## Supported Formats

### Preferred: RSS/JSON Feed
Structured data feeds with stable fields. Best for automated parsing and updates.

### Acceptable: Standardized HTML Blocks
HTML elements with required selectors and data attributes. Good for existing websites.

### Minimum: Plain Text Template
Strict plain-text format. Requires exact formatting but works with any system.

## Required Fields by Record Type

### Baptism Records
- **type**: Must be 'baptism' or 'Baptism'
- **date**: Date of baptism/reception (YYYY-MM-DD or MM/DD/YYYY)
- **person name**: First name and last name (or full name)

### Marriage Records
- **type**: Must be 'marriage' or 'Marriage'
- **date**: Date of marriage (YYYY-MM-DD or MM/DD/YYYY)
- **groom name**: Groom's first and last name
- **bride name**: Bride's first and last name

### Funeral Records
- **type**: Must be 'funeral' or 'Funeral'
- **death/burial date**: At least one date required (death date OR burial date)
- **deceased name**: First and last name of the deceased

## Format Examples

### JSON Feed Format

```json
{
  "items": [
    {
      "event_id": "baptism-2025-001",
      "type": "baptism",
      "date": "2025-01-15",
      "first_name": "John",
      "last_name": "Doe",
      "birth_date": "2024-12-01",
      "sponsors": "Jane Smith, Bob Johnson",
      "parents": "John Doe Sr., Mary Doe"
    },
    {
      "event_id": "marriage-2025-002",
      "type": "marriage",
      "date": "2025-02-20",
      "groom_first_name": "Michael",
      "groom_last_name": "Brown",
      "bride_first_name": "Sarah",
      "bride_last_name": "Williams"
    }
  ]
}
```

### HTML Format with Data Attributes

```html
<article class="om-announcement" 
         data-type="baptism" 
         data-date="2025-01-15"
         data-event-id="baptism-2025-001">
  <h3>Baptism</h3>
  <p><strong>Date:</strong> January 15, 2025</p>
  <p><strong>Name:</strong> John Doe</p>
  <p><strong>Birth Date:</strong> December 1, 2024</p>
  <p><strong>Sponsors:</strong> Jane Smith, Bob Johnson</p>
  <p><strong>Parents:</strong> John Doe Sr., Mary Doe</p>
</article>
```

### Plain Text Template Format

```
TYPE: baptism
DATE: 2025-01-15
FIRST_NAME: John
LAST_NAME: Doe
BIRTH_DATE: 2024-12-01
SPONSORS: Jane Smith, Bob Johnson
PARENTS: John Doe Sr., Mary Doe

---
```

## Corrections and Updates

**Recommended:** Include a stable `event_id` field in your announcements. This allows OrthodoxMetrics to:
- Detect and update existing records when corrections are made
- Prevent duplicate imports of the same event
- Track changes over time

When you need to correct an announcement, republish it with the same `event_id` but updated information. OrthodoxMetrics will automatically update the existing record instead of creating a duplicate.

## Best Practices

1. **Use consistent date formats**: YYYY-MM-DD is preferred, but MM/DD/YYYY is also accepted
2. **Include full names**: First and last names should be clearly separated
3. **Publish announcements promptly**: Import runs on a schedule; publish within 24 hours of the event for best results
4. **Test your format**: Use the validation feature in the admin panel to verify your format works correctly

## Support

For questions or assistance, contact your OrthodoxMetrics administrator or refer to the admin documentation.
