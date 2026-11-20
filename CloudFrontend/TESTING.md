# Pearl Dynamic (pvt) ltd- ERP & Accounting Software
## Comprehensive Test Cases Documentation

**Prepared by:** Senior ERP & Accounting Software QA Specialist  
**Scope:** Functional, Regression, Permission, UI/UX, Integration & Business Flow Testing  
**Application Type:** Distribution-centric ERP with full double-entry accounting, inventory, and sales/distribution workflows.  
**Date:** 2026

---

## Instructions for Use
- Test cases are written **module by module** (following the exact structure visible in the **Sidebar**).
- Each module contains:
  - Positive, Negative, Permission-based, and Edge-case scenarios.
  - Pre-conditions, clear steps, and expected results.
  - Focus on accounting/distribution business rules (posting, stock impact, credit, knock-off, etc.).
- **Do not implement all at once.** New modules/sub-modules will be added iteratively.
- Always test with different user roles (Super Admin vs limited permission users).

---

## 1. EXPLORATION NOTES (Sidebar → Distribution Section)

I first navigated the application sidebar by reading:

- `src/Components/Sidebar/SIdebar.jsx`
- `src/Components/Sidebar/OpensideBar.jsx`
- `src/utils/routes.jsx` (for all Distributor paths + ProtectedRoute permissions)
- `src/utils/permission.js` (DISTRIBUTOR permission tree)
- All `src/Pages/Distrbutor/*` and `src/Components/Distrbutor/*` folders + related shared masters in `Client/`

### Distributor Section in Sidebar (exact structure observed)

**Main Menu Item:**  
**Distributor** (icon: `TbLayoutDistributeHorizontal`)

**Inside Distributor:**

**A. Customers** (collapsible sub-dropdown)
- Zone
- Group List
- Region List
- City List
- Price List
- Distributor Order Booker
- Transport
- Distributor Customers (`/DistrbutorList`)

**B. Direct Menu Items (Distributor-specific transactions & views):**
- Sale Order (`/DistributorSaleOrderListPage`)
- RC (`/DitributorRcList`)
- Delivery Challan (`/OrderDCList`)
- Invoice (`/DistrbutorInvoice`)
- Sales Return
- Payment Receipt (`/paymentReciptList`)
- Knock Off (`/NoqoffAmount`)
- Stock Flow Report
- Client Ledger
- Order Management (`/DcReport`)
- Price List (duplicate entry)
- Booker Attendance (`/Attendance`)

**Key Observations (important for testing):**
- Geography masters (Zone/Region/City/Group) are **shared** with main "Customer" setup but have **separate Distributor permissions**.
- Distributor has its own **Sale Order**, **Order DC (Delivery Challan)**, **Invoice**, **RC** flows — different from main Transactions.
- Many list pages use **MUI DataGrid** + Redux for state.
- Heavy use of **ProtectedRoute** + `checkName()` / `checkuserSection()` permission checks.
- Posting/Unposting, bulk operations, and realization (payments) are critical business actions.

---

## MODULE-BY-MODULE TEST CASES

### MODULE 1: Distributor → Customers (Masters)

This is the foundation for all downstream Distributor transactions (Sale Orders, DC, Invoices, RC, Payments).

#### 1.1 Zone (Geography Master) — Permission: `DISTRIBUTOR.CUSTOMERS.ZONE.*`

**Relevant Files (verified):**
- Pages: `src/Pages/CLient/Zone/*` (ZonelistPage, ZoneAddPage, etc.)
- Components: `src/Components/Client/Zone/Zonelist.jsx` (and Add/Edit)
- Routes protected with `PERMISSIONS.DISTRIBUTOR.CUSTOMERS.ZONE`
- Accessed via Distributor sidebar → Customers → Zone
- Also Bulk Add supported

**Test Cases:**

| TC-ID | Title | Type | Priority | Pre-conditions | Test Steps | Expected Result |
|-------|-------|------|----------|----------------|------------|-----------------|
| DIST-ZONE-001 | Verify Zone menu visibility in Distributor sidebar | Permission / UI | High | User has "Zone List" permission under Distributor section. Login as such user. | 1. Open sidebar<br>2. Expand **Distributor**<br>3. Expand **Customers** | "Zone" menu item is visible and clickable. Clicking navigates to Zone list. |
| DIST-ZONE-002 | Zone menu hidden without permission | Permission | High | User does **not** have "Zone List" permission. | Same as above | "Zone" item does **not** appear under Distributor > Customers. |
| DIST-ZONE-003 | List Zones - Data loading & display | Functional | High | Zones exist in system. User has LIST permission. | 1. Navigate to Zone list via Distributor sidebar<br>2. Wait for DataGrid to load | All zones display correctly with columns (Code, ZoneName, etc.). Pagination, search, and sorting work. Loading spinner appears initially. |
| DIST-ZONE-004 | Add new Zone (happy path) | Functional / CRUD | High | User has ADD permission. No duplicate ZoneName/Code. | 1. Click "Add" button<br>2. Fill required fields (ZoneName, Code if present)<br>3. Submit | Success toast. New zone appears in list. Record saved to backend with correct Distributor context. |
| DIST-ZONE-005 | Add Zone - Validation errors | Negative | High | On Add screen | 1. Leave ZoneName empty<br>2. Submit<br>3. Try duplicate name | Proper inline/validation messages shown. Form does not submit on invalid data. |
| DIST-ZONE-006 | Bulk Add Zones | Functional | Medium | User has ADD_BULK permission. Prepare valid Excel/CSV. | 1. Click "Add in Bulk"<br>2. Upload file<br>3. Map columns if needed<br>4. Submit | All valid zones imported. Errors for duplicates/invalid rows shown clearly. Success count reported. |
| DIST-ZONE-007 | Edit existing Zone | CRUD | High | User has EDIT permission. Select a zone. | 1. Click Edit icon on a row<br>2. Modify ZoneName<br>3. Save | Record updated. Change reflected immediately in list. Audit (if any) updated. |
| DIST-ZONE-008 | Edit Zone - Permission denied | Permission | High | User has only LIST (no EDIT) | Try to access edit or see edit button | Edit action/button is hidden or route blocked with proper message. |
| DIST-ZONE-009 | Delete / Deactivate Zone | Functional + Impact | High | Zone not used by any Distributor Customer / Order Booker. User has delete rights (if exposed). | Attempt delete on unused zone | Deletion succeeds or soft-delete. Zone no longer available in downstream dropdowns (Distributor Customer creation). |
| DIST-ZONE-010 | Delete Zone that is in use | Negative / Business Rule | Critical | Zone linked to one or more Distributor Customers | Attempt delete | System prevents deletion with clear message: "Cannot delete. Zone is assigned to X distributors." |
| DIST-ZONE-011 | Search / Filter on Zone list | UI / Functional | Medium | Many zones exist | Use search box or column filters in DataGrid | Results filter correctly in real-time. Case-insensitive. |
| DIST-ZONE-012 | Pagination & Rows per page | UI | Low | >25 zones | Change rows per page and navigate pages | Correct records shown. State preserved on navigation where applicable. |
| DIST-ZONE-013 | Access Add/Edit pages directly via URL without permission | Security / Permission | High | User lacks ADD or EDIT permission | Directly hit `/ZoneAdd` or edit URL | Redirected to unauthorized page or 403-style handling (via ProtectedRoute). |
| DIST-ZONE-014 | Zone data consistency with Distributor Customer form | Integration | High | At least one zone exists | 1. Go to Add Distributor Customer<br>2. Open Zone dropdown | All active zones from the Zone master appear in the selector (populated via Redux or API). |
| DIST-ZONE-015 | Super Admin bypass vs normal Distributor user | Permission | Medium | Super Admin user vs regular user with Distributor section access | Compare sidebar and CRUD rights | Super Admin sees everything. Limited user only sees items allowed by their assigned rights. |

---

### Progress of Distribution Customers Masters (added module-by-module)

- **1.1 Zone Management** — Completed
- **1.2 Region Management** — Completed
- **1.3 City Management** — Completed
- 1.4 Group Management — Pending (next recommended)
- 1.5 Distributor Order Booker — Pending
- 1.6 Transport — Pending
- 1.7 Distributor Customers (core master) — Pending
- 2. Price List — Pending
- 3+. Transactional modules (Sale Order, DC, Invoice, RC, Payment Receipt, etc.) — Pending

Detailed test cases for each completed module appear in the sections below.

---

**Notes for Testers (ERP specific):**
- Always verify **downstream impact** (changing a Zone should affect existing Distributor Customers' reports/ledgers? Usually not retroactively, but new transactions must respect current master).
- Test **permission matrix** thoroughly — the sidebar uses both Section + SubSection + individual right checks.
- Focus on **posting/unposting** behavior once we reach transactional modules (DC, Invoice, etc.).
- DataGrid behavior, Redux hydration, and API error handling are recurring patterns.

---

---

#### 1.2 Region Management — Permission: `DISTRIBUTOR.CUSTOMERS.REGION.*`

**Relevant Files (verified):**
- Pages: `src/Pages/CLient/Region/RegionlistPage.jsx`, `RegionAddPage.jsx`, `RegionEditPage.jsx`, `BulkRegionAddpage.jsx`
- Components: `src/Components/Client/Region/RegionList.jsx`, `RegionAdd.jsx`, `RegionEdit.jsx`, `BulkRegion.jsx`
- Routes protected with `PERMISSIONS.DISTRIBUTOR.CUSTOMERS.REGION`
- Accessed via Distributor sidebar → Customers → Region List
- Strong hierarchy: **Group → Region**
- List shows resolved `Group` name
- Bulk upload uses Excel column named `Region`
- Delete has backend validation (400 error returned when Region is referenced)

**Test Cases:**

| TC-ID | Title | Type | Priority | Pre-conditions | Test Steps | Expected Result |
|-------|-------|------|----------|----------------|------------|-----------------|
| DIST-REG-001 | Verify Region menu visibility in Distributor > Customers | Permission / UI | High | User has "Region List" permission. | 1. Login with appropriate rights<br>2. Expand Distributor → Customers | "Region List" (or "Region") menu item is visible. Click navigates to Regions list. |
| DIST-REG-002 | Region menu hidden for unauthorized users | Permission | High | User lacks "Region List" right under Distributor. | Expand Distributor section | Region item does **not** appear in the Customers dropdown. |
| DIST-REG-003 | Regions list loads with Group relationship | Functional / Data | High | At least one Region linked to a Group exists. | Navigate to Region list via sidebar | DataGrid shows columns: Region Code, Region, Group (resolved GroupName). Loading state works. |
| DIST-REG-004 | Add new Region (with Group) - happy path | CRUD / Positive | High | User has ADD permission. At least one Group exists. | 1. Click "Add"<br>2. Enter Region Name<br>3. Select a Group from react-select dropdown<br>4. Submit | Success message. Auto-generated code. Record created with correct Group link. Redirects to list. |
| DIST-REG-005 | Add Region - Group is mandatory | Negative / Validation | High | On Add Region screen | 1. Enter Region Name<br>2. Leave Group unselected<br>3. Submit | Form should not submit successfully (or backend validation fails). Clear error feedback expected. |
| DIST-REG-006 | Bulk Add Regions via Excel | Functional | Medium | User has ADD_BULK permission. Excel file with "Region" column. | 1. Directly access /RegionAddBulk or trigger bulk<br>2. Upload XLSX with Region column<br>3. Submit | Records created via `/Region/PushBulkData`. Success toast. Note: Current bulk does not assign Group (potential gap to verify). |
| DIST-REG-007 | Bulk Region - Invalid file handling | Negative | Medium | Upload invalid file or wrong column | Upload file without "Region" column or non-Excel | Graceful error or no crash. Clear feedback to user. |
| DIST-REG-008 | Edit Region - Update name and/or Group | CRUD | High | User has EDIT permission. | 1. Click edit on a row<br>2. Change Region Name and/or re-select Group<br>3. Save | Record updated in backend. List reflects new Group name if changed. |
| DIST-REG-009 | Edit Region permission enforcement | Permission | High | User has only LIST rights for Region | Open edit URL or click edit icon | Edit functionality blocked (button hidden or route protected). |
| DIST-REG-010 | Delete unused Region | Functional | High | Region not referenced by any City or Distributor Customer. | 1. Click delete icon<br>2. Confirm in dialog | Record removed. Success toast ("Data Delete"). Row disappears from grid. |
| DIST-REG-011 | Delete Region that is in use (referential integrity) | Negative / Business Rule | Critical | Region is linked to one or more Cities or active Distributor records | Attempt delete | Backend returns 400 error. Toast shows the error message from server (e.g. "Region is in use"). Record is protected. |
| DIST-REG-012 | Search, filter and pagination on Regions | UI / Functional | Medium | 15+ Regions exist | Use DataGrid search / column filters, change page size | Filtering works on Code, RegionName, and Group columns. Pagination behaves correctly. |
| DIST-REG-013 | Direct URL access protection | Security | High | User without proper Region rights | Manually visit `/RegionAdd`, `/RegionAddBulk`, `/Regionedit/:id` | ProtectedRoute blocks access or redirects to unauthorized state. |
| DIST-REG-014 | Group-Region hierarchy impact on downstream | Integration | High | Create a Region under a specific Group. Then create a City or Distributor Customer | 1. Create Region under Group X<br>2. Go to City or Distributor Customer creation | The new Region should be available for selection only under the correct hierarchy (or at least visible in Region selectors). |
| DIST-REG-015 | Code auto-generation on Add | Functional | Low | Multiple Regions | Add several Regions without manually entering code | System correctly auto-generates sequential codes using lastCode API + generateNextCodeForCat. |
| DIST-REG-016 | Region list page header buttons | UI Consistency | Low | View Region list page | Inspect header | Only "Add" button is present (no "Add in Bulk" button in current page header, even though bulk route exists). |

---

#### 1.3 City Management — Permission: `DISTRIBUTOR.CUSTOMERS.CITY.*`

**Relevant Files (verified):**
- Pages: `src/Pages/CLient/City/CityListPage.jsx`, `CityAddPage.jsx`, `CityEditPage.jsx`, `BulkCityAddPage.jsx`
- Components: `src/Components/Client/City/CityList.jsx`, `CityAdd.jsx`, `CityEdit.jsx`, `BulkAddCity.jsx`
- Routes protected with `PERMISSIONS.DISTRIBUTOR.CUSTOMERS.CITY`
- Accessed via Distributor sidebar → Customers → City List
- Hierarchy: **Region → City**
- **Notable differences from Region/Zone**:
  - City list DataGrid does **not** display the parent Region column (even though Region data is fetched).
  - In Edit form, Region selector is **disabled** (`isDisabled={true}`).
  - Bulk upload posts to `City/AddInBulk` and expects columns `City` + optional `salesFlowRef`. Region assignment not supported in bulk.
  - Delete uses `/City/deleteCity/` and shows backend 400 messages on constraint violation.

**Test Cases:**

| TC-ID | Title | Type | Priority | Pre-conditions | Test Steps | Expected Result |
|-------|-------|------|----------|----------------|------------|-----------------|
| DIST-CITY-001 | Verify City menu visibility under Distributor > Customers | Permission / UI | High | User has "City List" permission. | 1. Login with Distributor rights<br>2. Expand Distributor → Customers | "City List" (or "City") menu item visible. Navigation to Cities list works. |
| DIST-CITY-002 | City menu hidden without permission | Permission | High | User lacks "City List" right. | Expand Distributor Customers dropdown | City item is not rendered in the sidebar. |
| DIST-CITY-003 | Cities list loads correctly | Functional / Data | High | Cities exist in the system. | Navigate to City list via sidebar | DataGrid renders with columns: City Code, City. Loading indicator appears. Raw data from /City is shown. |
| DIST-CITY-004 | Add new City with Region - happy path | CRUD / Positive | High | User has ADD permission. At least one Region exists. | 1. Click "Add"<br>2. Enter City Name<br>3. Select Region from dropdown<br>4. Submit | Auto code generated via `/City/lastCode`. Record created with Region link. Success toast and redirect to list. |
| DIST-CITY-005 | Add City - Region selection is mandatory | Negative / Validation | High | On Add City screen | 1. Enter only City Name<br>2. Do not select Region<br>3. Submit | Submission blocked or rejected. Proper validation feedback expected (frontend required or backend). |
| DIST-CITY-006 | Bulk Add Cities via Excel | Functional | Medium | User has ADD_BULK permission. Valid XLSX with "City" column. | 1. Access bulk page (or route)<br>2. Upload file containing City column (+ optional salesFlowRef)<br>3. Submit | Data sent to `City/AddInBulk`. Success message. Records created (Region not assigned via bulk). |
| DIST-CITY-007 | Bulk City upload - missing required column | Negative | Medium | Upload file without "City" column | Perform bulk upload with invalid structure | Upload may succeed partially or fail. Verify graceful handling and user feedback. |
| DIST-CITY-008 | Edit City name | CRUD | High | User has EDIT permission. | 1. Click Edit on a City<br>2. Change City Name<br>3. Save | Update succeeds via `/City/updateCity/{id}`. List reflects the change. |
| DIST-CITY-009 | Attempt to change Region on Edit City | Business Rule / UI | High | Open Edit City form | Inspect the Region dropdown | Region selector is disabled (`isDisabled={true}`). Region cannot be modified after creation. |
| DIST-CITY-010 | Edit City permission check | Permission | High | User has only LIST permission for City | Click edit or visit edit URL | Action is blocked by ProtectedRoute or UI elements are hidden. |
| DIST-CITY-011 | Delete unused City | Functional | High | City is not referenced by any Distributor Customer or other records. | 1. Click delete icon<br>2. Confirm dialog | Delete API called. Row removed from grid. No error. |
| DIST-CITY-012 | Delete City that is in use | Negative / Referential Integrity | Critical | City assigned to one or more Distributor Customers | Attempt to delete | Backend returns HTTP 400. Toast displays the error message from `err.response.data`. Record protected. |
| DIST-CITY-013 | Search, pagination and filtering on Cities | UI / Functional | Medium | Multiple Cities exist | Use DataGrid search, change rows per page | Works on Code and CityName columns. Note: No Region column available for filtering. |
| DIST-CITY-014 | Direct URL protection for City routes | Security | High | User without City rights | Try `/CityAdd`, `/CityAddBulk`, `/Cityedit/:id` | Access denied via ProtectedRoute. |
| DIST-CITY-015 | Hierarchy: Region → City impact on Distributor Customers | Integration | High | Create City under a specific Region | 1. Create City under Region R<br>2. Go to Add Distributor Customer | City should be selectable under the correct Region context in downstream forms (e.g. Distributor Customer master). |
| DIST-CITY-016 | Code auto-generation for Cities | Functional | Low | Add multiple Cities | Create new Cities without providing code | System auto-generates code using lastCode endpoint + `generateNextCodeForCat`. |
| DIST-CITY-017 | City list page header vs bulk route | UI / Consistency | Low | View City list | Check header buttons | Only "Add" button visible. Bulk functionality exists via route but not exposed in list header (same pattern as Region). |
| DIST-CITY-018 | Missing Region column in City list (data visibility) | UI / Data Consistency | Medium | Cities linked to Regions exist | Inspect the DataGrid columns | List only shows Code + CityName. Parent Region is **not** displayed (inconsistency with Region list which shows its parent Group). This is an observation to verify if intentional. |

---

#### 1.4 Group Management — Permission: `DISTRIBUTOR.CUSTOMERS.GROUP.*`

**Relevant Files (verified):**
- Pages: `src/Pages/CLient/Group/GrouplistPage.jsx`, `GroupAddPage.jsx`, `GroupEditPage.jsx`, `GroupAddBulkpage.jsx`
- Components: `src/Components/Client/Group/GroupList.jsx`, `GroupAdd.jsx`, `GroupEdit.jsx`, `GroupAddBulk.jsx`
- Routes: `/Grouplist`, `/GroupAdd`, `/Groupedit/:id` (protected under DISTRIBUTOR.CUSTOMERS.GROUP)
- **Important note:** No `ADD_BULK` permission exists for GROUP (unlike Zone/Region/City). However, the list page renders an "Add in Bulk" button linking to `/GroupAddBulk`.
- Hierarchy: **Zone → Group** (Group belongs to a Zone). Then Group is parent to Regions.
- List does **not** display the linked Zone (same visibility problem as City list).
- Bulk implementation is heavily broken (copy-pasted from Zone component, writes to Zone endpoints).

**Test Cases:**

| TC-ID | Title | Type | Priority | Pre-conditions | Test Steps | Expected Result |
|-------|-------|------|----------|----------------|------------|-----------------|
| DIST-GRP-001 | Verify Group List menu visibility in Distributor > Customers | Permission / UI | High | User has "Group List" permission. | Expand Distributor → Customers in sidebar | "Group List" item is visible. Clicking goes to Groups list. |
| DIST-GRP-002 | Group menu hidden without permission | Permission | High | User does not have "Group List". | Check sidebar under Distributor Customers | Group List item does not appear. |
| DIST-GRP-003 | Groups list loads with correct columns | Functional | High | Groups exist. | Navigate to /Grouplist via sidebar | DataGrid shows "Group Code" and "Group Name". No Zone column is displayed (even though Zone data is fetched). |
| DIST-GRP-004 | Add new Group linked to Zone - happy path | CRUD / Positive | High | User has ADD permission. At least one Zone exists. | 1. Click "Add"<br>2. Enter Group Name<br>3. Select a Zone from dropdown<br>4. Submit | Auto-generated code via `/Group/lastCode`. Record saved with Zone reference. Success and redirect. |
| DIST-GRP-005 | Add Group - Zone is required | Negative / Validation | High | On Add Group form | Submit without selecting Zone | Should fail validation or backend reject. Form has no client-side enforcement visible on Zone. |
| DIST-GRP-006 | Bulk Add button presence vs permission | Permission / UI | High | User has only LIST + ADD for Group (no ADD_BULK) | View Groups list page | "Add in Bulk" button is still rendered in the header (inconsistent with permission model). |
| DIST-GRP-007 | Bulk Add for Group functionality | Negative / Bug | Critical | Click "Add in Bulk" or visit /GroupAddBulk | Upload Excel and submit | **Broken**: The component (GroupAddBulk) is a copy-paste of Zone bulk. It maps `ZoneName` and calls `/Zone/PushBulkData`. No Groups are created. This must be reported as a defect. |
| DIST-GRP-008 | Edit Group name only | CRUD | High | User has EDIT permission. | Open Edit on a Group | Form only allows editing GroupName. No ability to change the linked Zone (Zone selector is absent in edit form). |
| DIST-GRP-009 | Edit Group permission enforcement | Permission | High | User lacks EDIT right | Attempt edit via UI or direct URL | Blocked. |
| DIST-GRP-010 | Delete unused Group | Functional | High | Group has no child Regions or Distributor records. | Click delete and confirm | Record removed (basic optimistic delete in UI). |
| DIST-GRP-011 | Delete Group that has child data (referential integrity) | Negative / Business Rule | Critical | Group has Regions under it, or used in Distributor Customers | Attempt delete | Likely fails at backend (similar to Region/City). Verify 400 handling or error message. Note: Current GroupList delete has no try/catch for errors unlike City/Region. |
| DIST-GRP-012 | Search / pagination on Groups | UI | Medium | 10+ Groups | Use DataGrid search and pagination | Works on code and name. |
| DIST-GRP-013 | Direct URL access to Group routes | Security | High | Unauthorized user | Hit `/GroupAdd`, `/Groupedit/:id`, `/GroupAddBulk` | Protected by route-level permissions for the main ones. Bulk route may not be protected. |
| DIST-GRP-014 | Zone → Group hierarchy in downstream modules | Integration | High | Create Group under a Zone | Use the Group in Region creation or Distributor Customer | Regions can only be created under valid Groups. Groups appear in relevant selectors for Distributor masters. |
| DIST-GRP-015 | Code auto-generation | Functional | Low | Add several Groups | Observe code field | Uses lastCode + generateNextCodeForCat correctly. |
| DIST-GRP-016 | Unused code in Add form | Code Quality / Regression | Low | Open Group Add | Inspect dropdowns | Vendor dropdown is fetched and prepared but never rendered or used in the form (dead code). |
| DIST-GRP-017 | List page header consistency with other geo masters | UI | Low | Compare with City/Region list | View header | Both "Add" and "Add in Bulk" buttons are present for Group (only geo master with bulk button in header). |
| DIST-GRP-018 | Group as parent to Region (deletion impact) | Business Rule | High | Delete a Group that has Regions | Attempt the delete after creating dependent Region | Should be prevented. Test full chain: Zone > Group > Region > City. |

---

**Status Update:**
- Module 1.1 (Zone) — **Completed**
- Module 1.2 (Region Management) — **Completed**
- Module 1.3 (City Management) — **Completed**
- **Module 1.4 (Group Management) — Completed**

**Next Planned (following sidebar order under Distributor Customers):**
- 1.5 Distributor Order Booker
- 1.6 Transport
- 1.7 Distributor Customers (core master)
- 2. Price List (also appears in the dropdown)
- Then transactional: Sale Order, RC, Delivery Challan, Invoice, etc.

**Key Observations / Risks for Group:**
- **Critical Bug**: Bulk "Add in Bulk" for Groups is completely non-functional. The component file is mis-copied from Zone and writes to the wrong API (`/Zone/...` with ZoneName). The route may also lack Distributor permission protection.
- Inconsistent data display: List does not show the parent Zone (same problem as City not showing Region).
- Edit form is limited (only name; no way to re-assign Zone).
- Delete implementation lacks error handling (no 400 catch shown in code).
- Permission model does not include ADD_BULK for Group, yet the UI exposes the button.
- Dead code (unused Vendor select in Add form).
- This master sits in the middle of the geographic hierarchy (Zone > Group > Region > City) used heavily by Distributor Customers.

#### 1.5 Distributor Order Booker (under Distributor Customers)

**Relevant Files (verified):**
- Pages: `src/Pages/Distrbutor/DitriButorOrderBooker/OrderBookerListPage.jsx`, `OrderBookerAddPage.jsx`, `OrderBookerEditPage.jsx`, `OrderBookerBulkAdd.jsx`
- Components: `src/Components/Distrbutor/DistributorOrderBooker/DistributorOrderBookerList.jsx`, `DistributorOrderBookerAdd.jsx`, `DistributorOrderBookerEdit.jsx`
- Bulk reuses shared `src/Components/OderBooker/BulkOderBookerAdd.jsx`
- Protected under `PERMISSIONS.DISTRIBUTOR.CUSTOMERS.ORDER_BOOKER.*` (LIST, ADD, EDIT, ADD_BULK)
- Note: Separate from main Customer Setup Order Booker (different API `/DitriButorOrderBooker` vs `/OrderBooker`, different permissions).
- Key fields: OrderBookerName, code (auto-generated), salesFlowRef, Region (linked), Address, Cnic, PhoneNumber, OrderBookerID (login), OrderBookerPassword.
- List displays resolved Region.
- Significant code reuse and navigation issues between distributor vs general order booker flows.

**Test Cases:**

| TC-ID | Title | Type | Priority | Pre-conditions | Test Steps | Expected Result |
|-------|-------|------|----------|----------------|------------|-----------------|
| DIST-OB-001 | Verify "Distributor Order Booker" menu in sidebar | Permission / UI | High | User has "OrderBooker List" under Distributor. | Expand Distributor > Customers | Menu item "Distributor Order Booker" visible. Navigates to list. |
| DIST-OB-002 | Menu hidden without permission | Permission | High | No ORDER_BOOKER LIST right. | Check sidebar | Item not shown. |
| DIST-OB-003 | List loads with correct columns and Region resolution | Functional | High | Order Bookers with Region assigned exist. | Go to Distributor Order Booker list | DataGrid shows: Master Code, Order Booker Code, Name, Sales Flow Ref, Region (resolved name+code). |
| DIST-OB-004 | Add Order Booker with Region and credentials | CRUD / Positive | High | User has ADD. Region exists. | 1. Click Add<br>2. Fill Name, Sales Flow Ref, Region, Address, Cnic, Phone, Login Id, Password<br>3. Submit | Auto code generated via `/DitriButorOrderBooker/getLast...` + generator. Record created with Region link and login fields. Success, redirect. |
| DIST-OB-005 | Add - Region required | Negative | High | Add form | Submit without Region | Should fail (client or server validation). |
| DIST-OB-006 | Bulk Add Order Bookers | Functional | Medium | User has ADD_BULK. Valid Excel. | Click "Add in Bulk", upload, submit | Uses shared bulk component. Records created via `OrderBooker/PushBulkData`. Success count. Note: Bulk code references Vendor salesFlowRef — may not align perfectly with distributor Region model. |
| DIST-OB-007 | Bulk validation errors | Negative | Medium | Invalid data in bulk file | Upload bad file | Shows error via validateArray or API. |
| DIST-OB-008 | Edit Order Booker (name, contact, credentials) | CRUD | High | User has EDIT. | Edit existing | Form pre-fills. Can update most fields. Note: Title on edit page incorrectly says "Add Order Booker". |
| DIST-OB-009 | Edit permission | Permission | High | No EDIT right | Attempt edit | Blocked. |
| DIST-OB-010 | Delete unused Order Booker | Functional | High | Not used in any Sale Order, Target, or Attendance. | Delete via list | Removed. UI optimistic update. |
| DIST-OB-011 | Delete when in use (sales/attendance) | Negative / Business Rule | Critical | Order Booker has associated Distributor Sale Orders or Attendance records. | Attempt delete | Should be blocked by backend (referential integrity). Verify error handling. |
| DIST-OB-012 | Login credentials handling | Security / Functional | High | Add or edit with Login Id + Password | Submit credentials | Stored (check if hashed on backend). Test login implications if this feeds user system. Do not expose plain text in UI. |
| DIST-OB-013 | Region hierarchy impact | Integration | High | Order Booker linked to Region | Use in Distributor Sale Order creation or Target | Order Booker selectable/filterable by its Region in downstream distributor transactions and reports. |
| DIST-OB-014 | Wrong navigation after add/edit | Bug / UI | Medium | Perform add or edit | After save | Currently redirects to `/OrderBookerList` (general) instead of distributor list. Should stay in distributor context. |
| DIST-OB-015 | Search / filter / pagination | UI | Medium | Many bookers | Use DataGrid | Works on name, codes, sales ref, Region. |
| DIST-OB-016 | Direct URL protection | Security | High | No rights | Hit add/edit/bulk URLs | ProtectedRoute blocks. |
| DIST-OB-017 | Usage in other distributor modules | Integration | High | Order Booker created | Create Sale Order, set Target, mark Attendance, run Booker-wise report | Appears correctly in Distributor Sale Order, OrderBookerTarget, Attendance (if separate), and reports like "Booker Wise Invoice", "Order Booker Achievement". |
| DIST-OB-018 | Code uniqueness and generation | Functional | Low | Multiple adds | Add several | Codes are unique, sequential per the distributor-specific last code endpoint. |

---

**Status Update:**
- Module 1.1 (Zone) — **Completed**
- Module 1.2 (Region Management) — **Completed**
- Module 1.3 (City Management) — **Completed**
- Module 1.4 (Group Management) — **Completed**
- **Module 1.5 (Distributor Order Booker) — Completed**

**Next Planned (following sidebar order):**
- 1.6 Transport
- 1.7 Distributor Customers (core master)
- 2. Price List
- Transactional modules (Sale Order, RC, Delivery Challan / Order DC, Invoice, Payment Receipt, etc.)

**Key Observations / Risks for Order Booker:**
- **Code duplication & context leakage**: Distributor-specific Order Bookers use separate API (`/DitriButorOrderBooker`) but bulk/delete/edit often hit general `/OrderBooker` endpoints and redirect to wrong list. This can cause data inconsistency.
- Edit page has title bug ("Add Order Booker").
- Bulk component is general (Vendor-focused) and may not fully support Region-only distributor model.
- Sensitive fields (Login Id, Password) are collected in plain forms — verify backend hashing and access control.
- Strong integration point: heavily used in Distributor Sale Orders, Targets, Attendance, and multiple reports.
- Delete protection critical because of downstream transaction usage.

#### 2.1 Distributor Sale Order

**Relevant Files (verified):**
- Pages: `src/Pages/Distrbutor/DistributorSaleOrder/DistributorSaleOrderListPage.jsx`, `DistributorSaleOrderAppPage.jsx` (add), `DistributorSaleOrderBulkAddPage.jsx`, `DistributorSaleOrderViewPage.jsx`, `SaleOrderEditPage.jsx`
- Components: `src/Components/Distrbutor/SaleOrder/DistributorSaleOrderList.jsx`, `DistributorSaleOrderAdd.jsx`, `DistributorSaleOrderBulkAdd.jsx`, `DistributorSaleOrderView.jsx`, `SaleOrderEdit.jsx`, `SaleOrderPostModal.jsx`, `SaleOrderUnPostModal.jsx`
- Protected under `PERMISSIONS.DISTRIBUTOR.SALE_ORDER.*` (LIST, ADD, ADD_BULK, VIEW, EDIT)
- Key flows: Create with line items (product, box/unit/carton, rates, GST, discounts), calculations, Post/Unpost (range modal), leads to Order DC (Delivery Challan) then Invoice.
- PostStatus (e.g. "Deliverd" — note spelling), Status flags control edit/delete.
- Enriched display: Distributor name + code, City, Store, Order #, TotalAmount.
- Uses Distributor master, Product (SND), Store, Location, Region via distributor.

**Test Cases:**

| TC-ID | Title | Type | Priority | Pre-conditions | Test Steps | Expected Result |
|-------|-------|------|----------|----------------|------------|-----------------|
| DIST-SO-001 | Verify Sale Order in Distributor sidebar | Permission / UI | High | User has "Distributor SaleOrder List". | Expand Distributor section | "Sale Order" menu visible under Distributor. Navigates to list. |
| DIST-SO-002 | Permission hidden without rights | Permission | High | No SALE_ORDER LIST. | Check sidebar | Not visible. |
| DIST-SO-003 | List loads with enriched data & status | Functional | High | Sale orders exist (posted/unposted). | Open list | Columns: Order Date, Order #, Distributor (name+code), City, Store, PostStatus, TotalAmount. Filtering/sorting works. |
| DIST-SO-004 | Add new Sale Order with line items | CRUD / Positive | High | Distributor, products, store exist. | 1. Click Add<br>2. Select Distributor (async), Store, Order Date<br>3. Add multiple product rows (box/unit/carton, adjust rates/GST/discount)<br>4. Submit | Line items calculate Gross, GST, Net, Totals. Record created with OrderCode. Success. |
| DIST-SO-005 | Line item validations (qty, duplicate product) | Negative | High | On Add form | 1. Add row with 0 or negative box<br>2. Add same product twice<br>3. Submit | Prevents invalid qty. Duplicate product warning or block ("Product Duplicate"). |
| DIST-SO-006 | Bulk Add Sale Orders | Functional | Medium | User has ADD_BULK. Valid template Excel. | Click bulk (or route), upload, submit | Uses XLSX + validation (validateSalesData). Multiple orders/lines imported. Errors shown for bad rows. |
| DIST-SO-007 | Edit Sale Order (only if not delivered) | CRUD | High | Unposted or non-delivered order. | Edit from list | Can modify header and lines. If PostStatus == "Deliverd", edit blocked with toast. |
| DIST-SO-008 | View Sale Order details | Functional | High | Any order. | Click View | Full details including all line items, totals, linked distributor/region. Print or export if available. |
| DIST-SO-009 | Post Sale Order (single via list or modal) | Business / Posting | Critical | Unposted order with lines. | Use Post action or Post modal (range from-to) | Status updated to posted. PostStatus changes. May create downstream DC. Cannot edit/delete after. |
| DIST-SO-010 | Unpost Sale Order | Business / Posting | Critical | Posted order (no downstream DC/Invoice yet?). | Unpost via modal or action | Status reversed. Allows edit/delete again. Verify stock/ledger reversal if applicable. |
| DIST-SO-011 | Delete only unposted orders | Business Rule | High | Posted order | Attempt delete | Blocked with message "first unpost for delete". Unposted: deletes successfully (with 400 error handling). |
| DIST-SO-012 | Distributor & Region linkage | Integration | High | Select Distributor that has Region/City/OrderBooker | Create order | Auto-fills or enforces Region/City from Distributor master. Order Booker context respected in reports. |
| DIST-SO-013 | Pricing & calculations (GST, discount, totals) | Functional | High | Add with varying rates, GST, discounts | Submit | Gross = rate * qty, Net after discount, GST computed correctly. TotalAmount accurate. |
| DIST-SO-014 | Store & Location selection | Functional | Medium | Multiple stores | Select different Store/Location | Order assigned to correct store. Affects inventory on post. |
| DIST-SO-015 | Navigation to Delivery Challan / Invoice | Integration | High | Posted order | From list or view, create DC or Invoice | Order appears in OrderDC creation. Later flows to DistrbutorInvoice. |
| DIST-SO-016 | Reports & downstream impact (Booker wise, DC Report) | Integration | High | Several orders posted | Run "Booker Wise Invoice", "Order Management (DC Report)", Stock Flow | Orders reflected correctly with quantities, amounts, status. |
| DIST-SO-017 | Permission matrix (View vs Edit vs Post) | Permission | High | Different users | Test LIST only, ADD only, EDIT, etc. | Add button, edit icon, post actions hidden appropriately. |
| DIST-SO-018 | Edge cases (empty lines, date in past/future, large qty) | Edge / Negative | Medium | Try extreme inputs | Submit empty table, future/past dates, very large box count | Proper validation. No crash on calculations or DB save. |
| DIST-SO-019 | Refresh data button | UI / Data | Low | Data changed externally | Click refresh | List reloads fresh from API without full page reload. |
| DIST-SO-020 | Post range modal behavior | Business | High | Multiple unposted orders | Open post modal, select from-to numbers | Posts only the range of matching unposted orders. Updates multiple records. |

---

**Status Update:**
- 1.1–1.4 (Geo masters: Zone, Region, City, Group) — Completed
- 1.5 Distributor Order Booker — Completed
- **2.1 Distributor Sale Order — Completed**

**Next Planned (Distribution transactional flow):**
- 2.2 Order DC (Delivery Challan)
- 2.3 Distrbutor Invoice
- 2.4 Ditributor RC (Receipt/Collection)
- 2.5 Payment Receipt + Realize
- Distributor Customers core master, Price List, Transport (if not covered), full cycle testing, reports specific to distribution.

**Observations / Risks for Sale Order:**
- Posting is a major control point (affects edit/delete + downstream DC/Invoice creation). Test stock/inventory impact if any.
- Complex line item table with many calculated fields — high risk for rounding/GST/discount errors.
- Range post/unpost modal is powerful (bulk status change by Order # range).
- Distributor master drives Region/City — test master data changes.
- Some status strings have typos ("Deliverd").
- Code has both "PostStatus" and "Status" — potential confusion in logic.

#### 2.2 Order DC (Delivery Challan)

**Relevant Files (verified):**
- Pages: `src/Pages/Distrbutor/OrderDC/OrderDCListPage.jsx`, `OrderDCAddPage.jsx`, `OrderDCEditPage.jsx`, `OrderDCViewPage.jsx`
- Components: `src/Components/Distrbutor/OrderDC/OrderDCList.jsx`, `OrderDCAdd.jsx`, `OrderDCEdit.jsx`, `OrderDCView.jsx`, `OrderDCPostModal.jsx`, `OrderDCUnPostModal.jsx`, `ReferchButtonofDC.jsx`
- Protected under `PERMISSIONS.DISTRIBUTOR.DELIVERY_CHALLAN.*` (LIST, ADD, EDIT, VIEW)
- Created primarily from posted Distributor Sale Orders (pulls DcData/products from SO).
- Key elements: DcNumber, DcDate, Distrbutor (enriched), Store, Location, Transport, Product lines (from SO), Status (posted flag).
- Post/Unpost uses range by DcNumber, performs inventory movement (CostOfSales / Finished Goods accounts via Admin).
- List enriches Distributor name/code. Delete guarded by posted status.

**Test Cases:**

| TC-ID | Title | Type | Priority | Pre-conditions | Test Steps | Expected Result |
|-------|-------|------|----------|----------------|------------|-----------------|
| DIST-DC-001 | Verify Delivery Challan in Distributor sidebar | Permission / UI | High | User has "Order DC List". | Expand Distributor | "Delivery Challan" menu visible. Navigates to list. |
| DIST-DC-002 | Permission enforcement | Permission | High | No DELIVERY_CHALLAN rights | Check sidebar and routes | Menu hidden; direct URLs blocked by ProtectedRoute. |
| DIST-DC-003 | List loads with enriched data | Functional | High | Posted Sale Orders exist | Open DC list | Shows DcNumber, DcDate, Distrbutor (name+code), City/Store/Location resolved, Status, product summary. |
| DIST-DC-004 | Add DC from Sale Order | CRUD / Integration | High | Posted Sale Order without DC yet | Go to Add, select Sale Order / pull data | Lines pre-populated from SO. Can adjust if needed. Creates DcOrder linked to SO. |
| DIST-DC-005 | Edit DC (only if unposted) | CRUD | High | Unposted DC | Edit | Allows changes to header/lines. If posted, edit icon or route blocked. |
| DIST-DC-006 | View DC details | Functional | High | Any DC | Click View | Shows full lines, linked SO, quantities, print/PDF option if available. |
| DIST-DC-007 | Post DC (single and range) | Business / Posting | Critical | Unposted DC(s) with valid data | Use Post from list or range modal (DcNumber from-to) | Status set to posted. Inventory moved (CostOfSales/FinishedGoods). Cannot edit/delete after. |
| DIST-DC-008 | Unpost DC | Business / Posting | Critical | Posted DC with no further Invoice | Unpost via modal | Reverses status and accounting entries. Allows re-edit. |
| DIST-DC-009 | Delete only unposted DC | Business Rule | High | Posted DC | Attempt delete | Blocked ("unpost first"). Unposted DC deletes cleanly (backend 400 error shown if violated). |
| DIST-DC-010 | Linkage from Sale Order | Integration | High | Posted SO | Create DC from SO | Quantities, products, distributor match the source SO. Prevents double DC creation on same SO. |
| DIST-DC-011 | Transport & Location assignment | Functional | Medium | Multiple transporters/locations | Assign during Add/Edit | DC assigned correctly. Used for delivery tracking and reports. |
| DIST-DC-012 | Reports impact (DC Report / Order Management) | Integration | High | Several DCs posted | Run DcReport / Order Management report | DCs appear with correct status, quantities, linked to SO and customer. |
| DIST-DC-013 | Stock / Inventory movement on post | Business / Accounting | Critical | Products with stock | Post DC | Decreases finished goods / increases COGS per Admin accounts. Verify via Stock Flow Report. |
| DIST-DC-014 | Range post validation | Business | High | Mix of posted/unposted in range | Try posting range with some already posted | Only unposted in range are processed. Errors or skips shown. |
| DIST-DC-015 | Permission matrix for Post/Unpost | Permission | High | User without post rights | Attempt post/unpost | Actions hidden or blocked. |
| DIST-DC-016 | Data consistency with downstream Invoice | Integration | High | Posted DC | Create Invoice from DC | Invoice pulls from posted DC. Quantities must match. |
| DIST-DC-017 | Refresh button | UI | Low | External changes | Click Refresh | List updates without full reload. |
| DIST-DC-018 | Edge cases (zero qty lines, missing transport, date issues) | Edge / Negative | Medium | Invalid data | Submit | Proper validation. No creation of zero-value DCs. |

#### 2.3 Distrbutor Invoice

**Relevant Files (verified):**
- Pages: `src/Pages/Distrbutor/DistrbutorInvoice/DistrbutorInvoicePage.jsx`, `DistrbutorInvoiceAddPage.jsx`, `DistrbutorInvoiceEditPage.jsx`, `DistrbutorInvoiceViewPage.jsx`
- Components: `src/Components/Distrbutor/DistrbutorInvoice/DistrbutorInvoiceList.jsx`, `DistrbutorInvoiceAdd.jsx`, `DistrbutorInvoiceEdit.jsx`, `DistrbutorInvoiceView.jsx`, `SaleInvoicePostModal.jsx`, `SaleInvoiceUnpostModal.jsx`, `SalesInvoiceBulkAdd..jsx`, `InvoiceTemplate.jsx`, `PdfDocument.jsx`, filter modal
- Protected under `PERMISSIONS.DISTRIBUTOR.INVOICE.*` (ADD, LIST, VIEW). Edit exists in code but limited in permissions.
- Primarily created from posted Delivery Challans (DCs) that are not yet invoiced (`/DcOrder/GetDcNotEqualFalse`).
- Reuses a lot of general Sales Invoice UI/components (modals named SaleInvoice*, bulk, templates).
- Post/Unpost affects accounts (via Admin and Chart of Accounts).
- Supports Bulk Add, PDF generation, PriceList integration.

**Test Cases:**

| TC-ID | Title | Type | Priority | Pre-conditions | Test Steps | Expected Result |
|-------|-------|------|----------|----------------|------------|-----------------|
| DIST-INV-001 | Verify Invoice menu in Distributor | Permission / UI | High | User has "Distributor Invoice List". | Check sidebar under Distributor | "Invoice" visible. Opens list (note: Add button is custom, not always in header like others). |
| DIST-INV-002 | List loads from posted DCs | Functional | High | Posted DCs without Invoice | Open Invoice list | Shows invoices with linked DC/SO data, customer, amounts, status. Only eligible DCs available for invoicing. |
| DIST-INV-003 | Add Invoice from DC | CRUD / Integration | High | Posted DC | Add, select DC | Pulls lines, quantities, pricing (from PriceList). Creates invoice linked to DC. |
| DIST-INV-004 | Bulk Add Invoices | Functional | Medium | User has ADD. Excel with valid DC refs | Use Bulk Add page | Imports multiple. Validation via validateSales. Links to DCs correctly. |
| DIST-INV-005 | View Invoice with template/PDF | Functional | High | Invoiced order | View | Renders InvoiceTemplate or PdfDocument. Shows full details, totals, tax. |
| DIST-INV-006 | Edit Invoice (limited) | CRUD | Medium | Unposted Invoice | Edit | Allows header/line changes before post. Post status blocks further edits. |
| DIST-INV-007 | Post Invoice (range capable) | Business / Posting | Critical | Unposted Invoice(s) | Post via modal (range by number) or list | Status true. Accounting entries (revenue, receivables, tax) posted using Admin/COA accounts. |
| DIST-INV-008 | Unpost Invoice | Business / Posting | Critical | Posted Invoice with no further activity (e.g. no RC/knockoff) | Unpost | Reverses accounting. Allows re-edit or delete. |
| DIST-INV-009 | Delete guards | Business Rule | High | Posted vs unposted | Attempt delete | Only unposted can be deleted. Posted require unpost first. Backend 400 errors surfaced. |
| DIST-INV-010 | Pricing from Price List | Functional / Integration | High | PriceList assigned to Distributor | Create Invoice | Rates pulled or validated against active PriceList for the customer/region. |
| DIST-INV-011 | Tax and totals calculation | Functional | High | Lines with GST/discount | Create or view | Correct net, tax, grand total. Consistent with upstream SO/DC. |
| DIST-INV-012 | Linkage to Payment Receipt / Knock Off | Integration | High | Posted Invoice | Go to Payment Receipt or NoqoffAmount | Invoice appears as outstanding. Realization and knockoff reduce balance. |
| DIST-INV-013 | Reports (Client Ledger, Invoice Aging, Sales Summary) | Integration | High | Multiple invoices posted | Run relevant reports | Invoices appear with correct aging, balances, summaries for the distributor. |
| DIST-INV-014 | Filter modal for selection | UI / Functional | Medium | Many DCs/Invoices | Use SaleInvoiceFilterModal | Filters by date, customer, DC, etc. to select for invoicing or viewing. |
| DIST-INV-015 | Permission differences (no full EDIT in perms) | Permission | High | User with only LIST/ADD/VIEW | Try edit route or actions | Edit may be UI-hidden or route-protected despite code presence. |
| DIST-INV-016 | PDF generation & printing | Functional | Low | Any invoice | View -> generate PDF | Clean invoice document with all details, company info from Admin. |
| DIST-INV-017 | Data consistency across SO -> DC -> Invoice chain | Integration / Data Integrity | Critical | Full flow executed | Trace quantities and amounts end-to-end | Line items, totals, and status consistent. No over-invoicing. |
| DIST-INV-018 | Refresh and pagination | UI | Low | Large volume | Use refresh button and DataGrid pagination | List stays current; pagination performs well. |

---

**Status Update:**
- 1.1–1.4 (Geo masters) + 1.5 (Order Booker) — Completed
- 2.1 Distributor Sale Order — Completed
- **2.2 Order DC (Delivery Challan) — Completed**
- **2.3 Distrbutor Invoice — Completed**

**Next Planned (Distribution transactional flow):**
- 2.4 Ditributor RC (Receipt/Collection)
- 2.5 Payment Receipt + Realize / Knock Off
- Full end-to-end cycle (SO → DC → Invoice → Payment → RC)
- Core Distributor Customers master (if not fully covered), Price List usage, Transport, and distribution-specific reports.

**Observations / Risks for DC & Invoice:**
- Strong sequential dependency: Posted SO → DC → Invoice. Test the entire chain for quantity/amount consistency and status propagation.
- Posting performs critical accounting (inventory movement for DC, revenue for Invoice). Verify against Stock Flow, General Ledger, and Client Ledger.
- Range post/unpost modals are powerful but risky (wrong range can mass-update status).
- Invoice reuses general Sales Invoice components (modals named SaleInvoice*) — risk of context leakage between regular sales and distributor flows.
- Limited permissions on Invoice (no explicit EDIT in permission.js, though UI supports it).
- Typos and dual status fields ("Deliverd", Status vs PostStatus) seen upstream may carry over.
- Bulk and template/PDF features need careful validation for data accuracy and formatting.

#### 2.4 Full End-to-End Distribution Transactional Cycle

**Scope:** End-to-end happy path and variations for the complete Distribution flow under the Distributor module. This ties together the previously tested modules (Sale Order → DC → Invoice → Payment Receipt + Realize → RC → Knockoff) plus supporting reports, accounting, stock, and permissions.

**Key Flow (verified from code and sidebar):**
1. Create & Post Distributor Sale Order (lines from products, linked to Distributor/Region/Store).
2. Create & Post Order DC (Delivery Challan) from posted SO (pulls DcData, inventory movement on post).
3. Create & Post Distrbutor Invoice from posted DC (pricing from PriceList, accounting on post).
4. Create Payment Receipt against remaining Distrbutor Invoices (select client/distributor, allocate to invoices, chq/bank details).
5. Realize Payment (bank reconciliation, account postings via Chart of Accounts + Admin settings).
6. Distributor RC (collection/receipt side, often vendor or specific flows, linked to products/stores).
7. Knockoff (NoqoffAmount): Match remaining invoices with receipts/vouchers to clear balances (AdjustVoucher).

**Supporting:** Client Ledger, RCReport, KnokoffReport, Stock Flow Report, Order Management (DC Report), permissions under DISTRIBUTOR.*, posting guards, data consistency (quantities/amounts propagate), accounting (COGS, revenue, receivables).

**Relevant Files (key ones inspected):**
- Sale Order, OrderDC, DistrbutorInvoice (as in 2.1–2.3)
- `src/Components/Distrbutor/PaymentRecipt/` (PaymentReciptAdd, List, RealizePayment)
- `src/Components/Distrbutor/DitributorRc/` (DitributorRcAdd, List, View)
- `src/Components/Accounts/NoqoffAmount/NoqoffAmount.jsx` (knockoff against DistrbutorInvoice + vouchers)
- Reports: ClientLedger, KnokoffReport, RCReport, StockFlowReport, etc.
- Linkages via APIs: /DistributorSaleOrder, /DcOrder, /DistrbutorInvoice, /PaymentRecived, /Rc, /voucher/AdjustVoucher

**Test Cases (E2E focused – combine previous modules with cross-checks):**

| TC-ID | Title | Type | Priority | Pre-conditions | Test Steps | Expected Result |
|-------|-------|------|----------|----------------|------------|-----------------|
| DIST-E2E-001 | Happy path full cycle (SO → DC → Invoice → Payment → Realize → Knockoff) | E2E / Positive | Critical | Clean distributor with Region, products, store, price list, bank accounts. | 1. Create & post SO with lines.<br>2. Create & post DC from that SO.<br>3. Create & post Invoice from DC.<br>4. Add Payment Receipt allocating to the invoice.<br>5. Realize the payment (select bank account).<br>6. Create RC if applicable.<br>7. Perform Knockoff on remaining (if any). | All documents created with consistent quantities/amounts. Statuses updated (Posted). Balances zero in Client Ledger. Stock moved correctly. No errors. |
| DIST-E2E-002 | Partial payment + remaining knockoff | E2E / Business Rule | High | Invoice created with amount > payment. | Follow E2E-001 but pay only partial in Payment Receipt. Then knockoff remaining with another voucher/receipt. | Invoice shows partial realized. Remaining appears in Knockoff and Client Ledger. Full clearance only after knockoff. |
| DIST-E2E-003 | Posting blocks downstream creation/edit | E2E / Guard | High | Unposted SO/DC/Invoice. | Try to create DC from unposted SO; Invoice from unposted DC; Payment from unposted Invoice. | System prevents or does not show unposted docs in selection (e.g. "GetDcNotEqualFalse", remain only filters). Edit/delete blocked until unposted. |
| DIST-E2E-004 | Data consistency across chain (qty & amounts) | Integration / Data Integrity | Critical | Full cycle with multiple lines. | After each step, verify in next module and reports (e.g. SO qty == DC qty == Invoice qty). Check totals match (incl. GST/discounts from PriceList). | Exact match in linked docs, Stock Flow, Client Ledger, DC Report. No discrepancies. |
| DIST-E2E-005 | Accounting impact verification | Accounting / E2E | High | Posted full cycle with realize. | Post each document. Check General Ledger / Client Ledger / Stock Flow for entries (COGS on DC post, Revenue/Receivable on Invoice post, Bank on Realize, adjustments on Knockoff). | Correct debit/credit per Admin accounts (COST OF SALES, finished goods, etc.). Balances update in reports. |
| DIST-E2E-006 | Permission matrix across cycle | Permission | High | Users with partial Distributor rights (e.g. only SO LIST + DC ADD). | Attempt each step with limited rights. | Menu items and actions (Add, Post, Knockoff) hidden or blocked per DISTRIBUTOR.SALE_ORDER / DELIVERY_CHALLAN / INVOICE / PAYMENT_RECEIPT / RC_LIST / KNOCKOFF. |
| DIST-E2E-007 | Error recovery: unpost mid-cycle and re-process | Business / Recovery | High | Full cycle partially posted. | Unpost Invoice after Payment Receipt created. Re-post and re-allocate. | Payment Receipt should handle or flag unposted source. Re-processing allowed only after unpost. No orphan entries. |
| DIST-E2E-008 | Over-allocation / negative remaining prevention | Negative / Validation | High | Invoice with small remaining. | In Payment Receipt or Knockoff, try to allocate more than remaining. | Validation error (e.g. "Amount Should Be Less then Voucher Amount" or similar in knockoff). No negative balances created. |
| DIST-E2E-009 | Reports verification at each stage and end | Reporting / E2E | High | Full cycle + partials. | After each posting: run Client Ledger, DC Report (Order Management), RCReport, KnokoffReport, Stock Flow, Booker Wise Invoice. At end verify all zero where expected. | Reports reflect live status, aging, remaining, movements. Knockoff Report shows cleared items. |
| DIST-E2E-010 | Bulk / multiple distributors in cycle | Volume / E2E | Medium | Multiple distributors with orders. | Create SO/DC/Invoice for 2+ distributors. Process payments/RC/knockoff mixed. | All flows independent per distributor (City/Region filtering). Reports filterable by distributor. |
| DIST-E2E-011 | Sales Return impact on cycle | Integration / Negative | Medium | Posted Invoice in cycle. | Create Sales Return against the invoice (if permitted in distributor flow). | Return reduces remaining in Payment/Knockoff. Affects ledger and aging. |
| DIST-E2E-012 | Date and period controls | Business Rule | Medium | Cross-month documents. | Create SO in prior period, DC/Invoice in current. Realize/Knockoff later. | Postings respect dates. Reports show correct periods. No cross-period pollution without admin controls. |
| DIST-E2E-013 | Delete / edit propagation | Guard / Data Integrity | High | Mid-cycle edit/delete attempt. | Try to delete unposted SO after DC created; edit posted Invoice. | Blocked with clear messages (e.g. "first unpost"). No orphan DCs/Invoices/Payments. |
| DIST-E2E-014 | Realize & RC linkage to bank/stock | Accounting / Functional | High | Payment realized with chq/bank. | Realize using specific bank account from Admin. Check RC if it feeds stock or separate collection. | Bank reconciliation entries correct. RC (if distributor-specific) shows proper allocation. |
| DIST-E2E-015 | Knockoff with mixed invoices/receipts (opening + current) | Complex Business | High | Opening Invoices + current cycle invoices + receipts. | In NoqoffAmount, select distributor with mix. Allocate current voucher to old + new. | AdjustVoucher succeeds. All remainings updated (DistrbutorInvoice + Opening). Client Ledger clean. |
| DIST-E2E-016 | Full cycle permission for super vs limited distributor user | Permission / Role | Medium | Super admin vs city-limited distributor user. | Run full cycle as both. | Limited user sees only their City distributors (as in PaymentReciptList and Noqoff logic). Super sees all. |
| DIST-E2E-017 | Performance / large line items | Volume | Low | SO with 50+ product lines. | Complete full cycle with large documents. | No timeouts. Calculations accurate. Post/Unpost/range modals handle volume. |
| DIST-E2E-018 | Audit trail / history across cycle | Audit | Medium | All steps with chqStatus or logTransaction where applicable. | Complete cycle. Check any history in views or reports. | Key postings (SO post, DC post, Invoice post, Realize, Knockoff) logged with user/time if implemented. |

**Status Update:**
- 1.1–1.4 (Geo masters: Zone, Region, City, Group) — Completed
- 1.5 Distributor Order Booker — Completed
- 2.1 Distributor Sale Order — Completed
- 2.2 Order DC (Delivery Challan) — Completed
- 2.3 Distrbutor Invoice — Completed
- **2.4 Full End-to-End Distribution Transactional Cycle — Completed**

**Next Planned:**
- Distribution-specific reports in detail (Client Ledger, Stock Flow, RCReport, KnokoffReport, DC Report, Booker-wise, etc.)
- Any remaining masters (Transport, core Distributor Customers if not covered, Price List usage validation)
- Cross-module (e.g. with main Transactions or Accounts)
- Edge/complex scenarios (returns, bulk across cycle, period close impact)

#### 3. Distribution-Specific Reports

**Relevant Files (verified from sidebar + routes):**
- `src/Pages/Reports/Accounts/ClientLedger/ClientLedger.jsx` + Popup (core for balances post Invoice/Payment/Knockoff; filters Distributor/City, Date, Status Post/Unpost/Both, Location/Store, Qty Type Box/Unit)
- `src/Pages/Reports/Accounts/DcReport/DcReport.jsx` (Order Management / DC Report; detailed movement tables, exports)
- `src/Pages/Reports/StockReportFlowReport.jsx` + Popup (Stock Flow; inventory movements from posted DC/Invoice)
- `src/Pages/Reports/REReport/RCReport.jsx` + Popup (RC Report; by Store/Location, Vendor, Product, Date, Summary vs Detail, Invoice Status)
- `src/Pages/Reports/Accounts/RemainKnokoff/RemainKnokoff.jsx` (KnokoffReport / Knockoff Remaining)
- `src/Pages/Reports/Accounts/PaymentRealizeReport/PaymentRealizeReport.jsx` + Popup
- `src/Pages/Reports/OrderBookerAchivment/OrderBookerAchivment.jsx` + Popup
- `src/Pages/Reports/CustomerAndOrderBookerWiseInvoice/CustomerAndOrderBookerWiseInvoice.jsx` + Popup (Booker Wise Invoice)
- `src/Pages/Reports/AttandanceReport.jsx` (Booker Attendance, accessible via Distributor)
- Routes protected mostly under `PERMISSIONS.REPORTS.*` (INVENTORY.STOCK_FLOW, SALES.CLIENT_LEDGER, DC_REPORT, KNOCKOFF, PAYMENT_REALIZE, ORDER_BOOKER_ACHIEVEMENT, etc.). Some (RCReport) have odd ADMINISTRATION.COSTING gating but appear in Distributor sidebar.

These reports are explicitly listed under the Distributor section in sidebar for post-cycle visibility (after full SO → DC → Invoice → Payment/Realize → RC → Knockoff flow).

**Test Cases (focused on post full-cycle accuracy, filters, consistency, and Distributor context):**

| TC-ID | Title | Type | Priority | Pre-conditions | Test Steps | Expected Result |
|-------|-------|------|----------|----------------|------------|-----------------|
| DIST-RPT-001 | Access reports via Distributor sidebar | Permission / UI | High | User has relevant REPORTS.* rights + Distributor section access. | Expand Distributor in sidebar | Stock Flow Report, Client Ledger, Order Management (DC Report), RC (via RCReport), Knock Off Report, Payment Realize, Booker Achievement, Booker Wise Invoice, Attendance visible as direct items. |
| DIST-RPT-002 | Client Ledger after full cycle | Report / Data Accuracy | Critical | Completed E2E cycle (SO posted → DC posted → Invoice posted → Payment realized → Knockoff). | Open Client Ledger, select the Distributor, full date range, Status=Both. | Shows exact opening → sales (Invoice) → receipts (Payment/RC) → knockoffs. Ending balance = 0 (or correct remaining). Enriched with City/Region. Drill to popup details matches source docs. |
| DIST-RPT-003 | Client Ledger filters & role limits | Functional / Permission | High | Multiple distributors across cities; limited user (loginVendor.City set). | As limited user: filter by Distributor. As super: all. Change Status (Post/Unpost/Both), Qty Type (Box), Store/Location. | Limited user only sees their City distributors (per code in ClientLedger). Filters correctly reduce data. Export includes filtered view. |
| DIST-RPT-004 | DC Report (Order Management) post cycle | Report / Accuracy | High | Posted DCs from SOs. | Open /DcReport, filter by date, Distributor, Status. | Lists DCs with linked SO, quantities moved, PostStatus. Matches quantities from SO/DC modules. Export to Excel works. |
| DIST-RPT-005 | Stock Flow Report inventory movements | Report / Stock | Critical | Full cycle with postings (DC post moves stock). | Run Stock Flow for the Distributor/Store/Location, date range covering postings. | Shows inflows (if any) and outflows (DC postings reduce finished goods). Quantities tie to DC lines. "Both" status option shows unposted too. |
| DIST-RPT-006 | RC Report (RCReport) | Report / Accuracy | High | RC entries created in cycle (or related receipts). | Open RCReport, select Store/Location, Vendor/Product (if applicable), date, Summary vs Detail, Invoice Status. | Correct RC totals by store/location/vendor/product. Detail vs summary toggle works. Ties to Payment/RC modules. |
| DIST-RPT-007 | Knockoff Report / RemainKnokoff after knockoff | Report / Accuracy | High | Knockoffs performed (full or partial). | Open KnokoffReport (RemainKnokoff), filter by Distributor/Client, date. | Shows remaining before/after knockoff. Cleared items no longer appear or show zero remaining. Matches NoqoffAmount adjustments. |
| DIST-RPT-008 | Payment Realize Report | Report / Accuracy | High | Payments realized in cycle. | Run PaymentRealizeReport, filter by date, account, distributor. | Lists realized amounts, bank postings, ties to RealizePayment component. Status and totals accurate. |
| DIST-RPT-009 | Booker Wise Invoice & Achievement | Report / Integration | Medium | Orders with OrderBooker (via Distributor). | Run CustomerAndOrderBookerWiseInvoice and OrderBookerAchivment for the period/distributor. | Correct aggregation by booker. Matches SO/Invoice data. Achievement shows targets vs actual if configured. |
| DIST-RPT-010 | Cross-report consistency | Integration / Accuracy | Critical | Full cycle data. | Compare Client Ledger ending balance vs Sundry Debtor Balance / Invoice Aging for same distributor. Check Stock Flow qty vs DC Report. | Numbers match (e.g. ledger balance = aging remaining). Stock movements reconcile with DC/Invoice quantities. |
| DIST-RPT-011 | Date range & status filters across reports | Functional | High | Mix of posted/unposted in period. | Run Client Ledger, DC Report, Stock Flow with different date ranges and Post/Unpost/Both. | Only relevant docs appear. Unposted don't affect balances in "Post" mode. |
| DIST-RPT-012 | Limited user (City/OnlyDist) visibility in reports | Permission / Role | High | loginVendor with City or OnlyDist restrictions. | Run reports as limited vs super user. | Limited users only see data for their City/distributors (enforced in ClientLedger, Payment lists, etc.). No cross-city leakage. |
| DIST-RPT-013 | Export functionality | UI / Functional | Medium | Data present in report. | Use Export/Excel buttons in ClientLedger, DcReport, RCReport, etc. | Exports filtered data correctly (columns match on-screen). Handles large datasets. |
| DIST-RPT-014 | Drill-down / Popup details | UI / Accuracy | Medium | Report with summary rows. | Click row or "view" in ClientLedgerPopup, DC Report details, etc. | Popup shows line-level detail matching source SO/DC/Invoice/Payment. Consistent with main list views. |
| DIST-RPT-015 | Performance with full cycle volume | Volume | Low | Many transactions in period. | Run reports with wide date range + many distributors. | Loads in reasonable time, pagination/filtering responsive, no timeout on exports. |
| DIST-RPT-016 | Reports after returns / adjustments | Edge / Accuracy | Medium | Sales Return or negative adjustment in cycle. | Include return in flow, then run Client Ledger, Stock Flow, Knockoff Report. | Returns reduce balances/quantities correctly. Aging and stock reflect net effect. |
| DIST-RPT-017 | RCReport vs Payment Realize vs Client Ledger tie-out | Integration | High | RC and realized payments in period. | Cross-check RCReport totals, Payment Realize amounts, and Client Ledger receipts. | All three reconcile (e.g. realized payments appear in ledger and RC reports). |
| DIST-RPT-018 | Permission gating on report routes | Security | High | User without specific REPORTS.* perm. | Direct URL access to /ClientLedger, /DcReport, /StockFlowReport, etc. | ProtectedRoute blocks or redirects. Sidebar items hidden. |

**Status Update:**
- Previous modules (1.x geo + 2.1–2.3 transactional) + Full Cycle (2.4) — Completed
- **3. Distribution-Specific Reports — Completed (first item of "next planned")**

**Next Planned:**
- Remaining masters (1.6 Transport, 1.7 core Distributor Customers, Price List validation)
- Cross-module integration (Distribution + main Transactions/Accounts/Inventory)
- Period-close / MonthClose impact on distribution flows and reports
- More detailed edge/complex scenarios (bulk across cycle, returns full flow, multi-city limited users)

#### 1.6 Transport (under Distributor Customers)

**Relevant Files (verified):**
- Pages: `src/Pages/Distrbutor/Transporter/TransporterListPage.jsx`, `TransporterAddPage.jsx`, `TransporterEditPage.jsx`
- Components: `src/Components/DistributorSetup/Transporter/TransporterList.jsx` (and Add/Edit counterparts)
- Protected under `PERMISSIONS.DISTRIBUTOR.CUSTOMERS.TRANSPORT.LIST/ADD`
- Also appears in DC creation (transporter assignment for delivery), and TransporterLedger report.
- Simple master: Code, TransporterName, OldCode. Linked to Zone in some data fetches.
- Used for logistics in Order DC / Delivery Challan flows.

**Test Cases:**

| TC-ID | Title | Type | Priority | Pre-conditions | Test Steps | Expected Result |
|-------|-------|------|----------|----------------|------------|-----------------|
| DIST-TRN-001 | Verify Transport menu in Distributor > Customers sidebar | Permission / UI | High | User has "Transport List" under Distributor. | Expand Distributor > Customers | "Transport" item visible. Navigates to Transporters list. |
| DIST-TRN-002 | Transport hidden without permission | Permission | High | No TRANSPORT rights. | Check sidebar | Item not rendered. |
| DIST-TRN-003 | List loads with basic columns | Functional | High | Transporters exist. | Open list via sidebar | DataGrid: Transport Code, Transport Name, OldCode. Search/pagination work. |
| DIST-TRN-004 | Add new Transporter | CRUD / Positive | High | User has ADD. Zone data if linked. | Click Add, fill Name (code auto?), submit | Record created. Appears in list. Code generation similar to other geo masters. |
| DIST-TRN-005 | Edit Transporter | CRUD | High | User has EDIT. | Edit from list | Updates Name/Code. Changes reflected in DC assignment dropdowns. |
| DIST-TRN-006 | Delete unused Transporter | Functional | High | Not assigned to any DC or order. | Delete via confirm dialog | Removed. UI optimistic update. |
| DIST-TRN-007 | Delete when in use (referential integrity) | Negative / Business | Critical | Transporter assigned in active/past Delivery Challans | Attempt delete | Blocked (likely 400 from backend). Clear error message. |
| DIST-TRN-008 | Usage in Order DC creation | Integration | High | Create DC for a distributor | Select transporter in DC add/edit | Transporters from this master appear in dropdown. Selected one stored on DC. |
| DIST-TRN-009 | Transporter Ledger report | Report / Accuracy | Medium | Transactions involving transporters (if any) or DC deliveries | Run TransporterLedger report, filter by transporter/date | Shows relevant movements/ledgers. Ties to DC data if logistics tracked. |
| DIST-TRN-010 | Linkage to Zone (if applicable) | Functional / Hierarchy | Low | Zones exist | Check add/edit or data enrichment | Some data loads Zone alongside (from getData in list). Test filtering/assignment if UI supports. |
| DIST-TRN-011 | Permission for Add vs List | Permission | High | User with only LIST | Try Add button/route | Add hidden or blocked. |
| DIST-TRN-012 | Search and bulk visibility | UI | Low | Many transporters | Use grid search; check for bulk (if any) | Search works on name/code. Note: No bulk button visible in page header (unlike some geo). |

#### 1.7 Distributor Customers (core master)

**Relevant Files (verified):**
- Pages: `src/Pages/Distrbutor/Distributor/DistrbutorListPage.jsx`, `DistrbutorAddPage.jsx`, `DistrbutorViewPage.jsx`, `DistributorBulKadd.jsx`
- Components: `src/Components/Distrbutor/Distributor/DistrbutorList.jsx`, `DistrbutorAdd.jsx`, `DistrbutorEdit.jsx`, `DistrbutorView.jsx`, `BulkDistributorAdd.jsx`
- Protected under `PERMISSIONS.DISTRIBUTOR.CUSTOMERS.DISTRIBUTOR_CUSTOMER.LIST/ADD/VIEW/EDIT`
- Core entity for all distributor transactions. Links to: City, OrderBooker (DitriButorOrderBooker), Transport, PriceList, Channel, Zone/Region indirectly via geo.
- List enriches with CityName, OrderBookerName.
- API often `/Distrbutor?main=true`
- Used in: Sale Order (Distrbutor field), DC, Invoice, Payment Receipt, RC, Knockoff, Client Ledger, reports.
- Bulk add supported. View/Edit detailed (probably tabs for basic, contacts, pricing, etc. from add patterns).

**Test Cases:**

| TC-ID | Title | Type | Priority | Pre-conditions | Test Steps | Expected Result |
|-------|-------|------|----------|----------------|------------|-----------------|
| DIST-DCUST-001 | Verify "Distributor Customers" in sidebar | Permission / UI | High | User has "Distributor List". | Expand Distributor > Customers | "Distributor Customers" item visible. Opens the master list. |
| DIST-DCUST-002 | List with enrichments and search | Functional | High | Multiple distributors with linked data. | Open list | Columns include enriched City, OrderBookerName. Search filters on name/code/city. Pagination. |
| DIST-DCUST-003 | Add Distributor Customer (with links) | CRUD / Positive | High | Geo masters (City, OrderBooker, Transport, PriceList) exist. | Click Add (or Bulk). Select City, OrderBooker, Transport, PriceList, fill name/code/details. Submit. | Record created with all FKs. Enriched display in list. Code auto-gen if applicable. |
| DIST-DCUST-004 | Bulk Add Distributors | Functional | Medium | User has ADD_BULK. Valid Excel/CSV. | Use Bulk Add button/page, upload, map columns. | Multiple records imported. Errors for duplicates/invalids shown. |
| DIST-DCUST-005 | View Distributor details | Functional | High | Distributor with transactions. | Click View from list | Shows full details: linked masters, perhaps history of SO/DC/Invoices. Consistent with list enrichments. |
| DIST-DCUST-006 | Edit Distributor (update links) | CRUD | High | User has EDIT. | Edit, change City/OrderBooker/Transport/PriceList. | Updates propagate. New SO/DC use updated links. Old docs retain historical? (test). |
| DIST-DCUST-007 | Delete unused Distributor | Functional | High | No linked SO, DC, Invoice, Payment, etc. | Delete via dialog | Removed successfully. |
| DIST-DCUST-008 | Delete when in use (referential integrity) | Negative / Business | Critical | Distributor has active/past Sale Orders, DCs, Invoices, or open balances | Attempt delete | Blocked by backend (400 error shown). Message like "cannot delete, referenced in transactions". |
| DIST-DCUST-009 | Usage across transactional modules | Integration | Critical | Distributor created with links. | Create SO → DC → Invoice → Payment for it. Check reports/ledger. | Appears correctly in all (SO list as Distrbutor, DC, Invoice, Payment allocation, Client Ledger, Knockoff). |
| DIST-DCUST-010 | PriceList and OrderBooker linkage impact | Functional / Pricing | High | Multiple PriceLists and Bookers assigned. | Create SO/Invoice using the distributor | Pricing from assigned PriceList. Booker context in reports/attendance. |
| DIST-DCUST-011 | City/Geo filtering for limited users | Permission / Role | High | loginVendor with City restriction. | As limited user, view list/add. | Only sees distributors in their City. Add enforces/ filters by allowed City. |
| DIST-DCUST-012 | Search, filter, and performance on large list | UI / Volume | Medium | 100+ distributors. | Use search, column filters, pagination. | Fast response. Search on enriched fields (City, BookerName) works. |
| DIST-DCUST-013 | Consistency with reports (Client Ledger, Stock Flow) | Report / Accuracy | High | Transactions exist for distributor. | Run Client Ledger / Stock Flow filtered to this distributor. | Matches master data and transaction totals from SO/DC/Invoice. |
| DIST-DCUST-014 | Permission granularity (View vs Edit vs List) | Permission | High | User with partial rights (e.g. only LIST + VIEW) | Attempt edit/add from list or direct. | Actions hidden or routes protected per DISTRIBUTOR_CUSTOMER perms. |

**Status Update:**
- 1.1–1.5 (Customers sub: geo + Order Booker) — Completed
- **1.6 Transport — Completed**
- **1.7 Distributor Customers (core master) — Completed**
- 2.x Transactional + 3. Reports + 2.4 Full Cycle — Completed

**Next Planned (updated):**
- Deeper Price List validation in distribution context (pricing enforcement in SO/Invoice, bulk price updates)
- Cross-module integration (Distribution flows impacting main Inventory/Accounts/Transactions; returns affecting knockoff)
- Period-close / MonthClose / YearEnd impact on open distributor balances, postings, reports
- More detailed edge/complex (full returns cycle, multi-store, credit limits if any, concurrent edits, large bulk across modules)
- Transporter Ledger and other distributor-linked reports in more depth if needed
- Any remaining (e.g. Attendance in distributor context, Stock Flow specifics for distributors)

Please reply with the next (e.g. "Price List", "cross-module", "MonthClose", or "next planned 3"). I will inspect the files (e.g. PriceList components under Distrbutor, Noqoff interactions, MonthClose) and append the detailed test cases.

Please reply with the next (e.g. "Transport", "core Distributor Customers", "reports more", or "next planned 2"). I will inspect the files (e.g. Transport components, Distrbutor master, PriceList usage in SO/Invoice) and append.
