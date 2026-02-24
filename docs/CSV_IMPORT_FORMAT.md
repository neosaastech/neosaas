# CSV Import Format

## Users Import

### Format
The CSV file for users must contain the following columns in this exact order:

```
username,firstName,lastName,email,password,companyId,role
```

### Column Descriptions

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| `username` | No | User's unique username | `jdoe` |
| `firstName` | Yes | User's first name | `John` |
| `lastName` | Yes | User's last name | `Doe` |
| `email` | Yes | User's email address | `john.doe@company.com` |
| `password` | No | Initial password (if empty, defaults to `ChangeMe123!`) | `SecurePass123!` |
| `companyId` | No | Company UUID or `none` for platform admin | `550e8400-e29b-41d4-a716-446655440000` |
| `role` | No | User role (defaults to `reader` if empty) | `writer` |

### Available Roles
- `reader` - Read-only access (Company scope)
- `writer` - Read and write access (Company scope)
- `admin` - Platform administrator
- `super_admin` - Super administrator with full access

### Example CSV

```csv
username,firstName,lastName,email,password,companyId,role
jdoe,John,Doe,john.doe@company.com,SecurePass123!,550e8400-e29b-41d4-a716-446655440000,writer
asmith,Alice,Smith,alice.smith@company.com,AnotherPass456!,550e8400-e29b-41d4-a716-446655440000,reader
,Bob,Johnson,bob@platform.com,AdminPass789!,none,admin
```

### Import Process
1. Click the **Import CSV** button in the Users tab
2. Select your CSV file
3. The system will:
   - Validate each line
   - Create users successfully parsed
   - Report any errors
   - Display a summary of imported users

### Notes
- Quotes (`"`) in values must be escaped as `""`
- Empty fields will use default values where applicable
- Invalid emails or duplicate emails will cause import to fail for that user
- Company IDs must exist in the database or use `none` for platform users

---

## Companies Import

### Format
The CSV file for companies must contain the following columns in this exact order:

```
name,email,phone,address,city,zipCode,siret,vatNumber
```

### Column Descriptions

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| `name` | Yes | Company name | `Acme Corporation` |
| `email` | Yes | Company contact email | `contact@acme.com` |
| `phone` | No | Company phone number | `+33 1 23 45 67 89` |
| `address` | No | Company street address | `123 Main Street` |
| `city` | No | City name | `Paris` |
| `zipCode` | No | Postal/ZIP code | `75001` |
| `siret` | No | SIRET number (France) | `12345678900012` |
| `vatNumber` | No | VAT identification number | `FR12345678901` |

### Example CSV

```csv
name,email,phone,address,city,zipCode,siret,vatNumber
Acme Corporation,contact@acme.com,+33 1 23 45 67 89,123 Main Street,Paris,75001,12345678900012,FR12345678901
Tech Solutions,info@techsolutions.fr,+33 9 87 65 43 21,456 Innovation Ave,Lyon,69001,98765432100034,FR98765432109
"Global Services, Inc.",hello@globalservices.com,,,,,
```

### Import Process
1. Click the **Import CSV** button in the Companies tab
2. Select your CSV file
3. The system will:
   - Validate each line
   - Create companies successfully parsed
   - Report any errors
   - Display a summary of imported companies

### Notes
- Company names with commas must be wrapped in quotes
- Duplicate company emails will cause import to fail for that company
- All companies are created as **Active** by default
- Optional fields can be left empty
- SIRET format is not validated during import
- VAT Number format is not validated during import

---

## Best Practices

### File Encoding
- Use **UTF-8** encoding for proper handling of special characters
- Ensure line endings are consistent (LF or CRLF)

### Data Quality
- Validate email addresses before import
- Ensure company IDs exist when importing users
- Use strong passwords for initial user creation
- Double-check role assignments

### Testing
1. Start with a small test file (1-3 entries)
2. Verify the import works correctly
3. Then import your full dataset

### Error Handling
- Review error messages carefully
- Fix issues in your CSV file
- Re-run the import
- The import process is **not transactional** - successfully imported entries remain even if some fail

---

## Download Sample Files

You can create sample CSV files using the export feature:
1. Go to Users or Companies tab
2. Click **Export CSV**
3. Use the exported file as a template for your imports

