'use client'

import { useState } from 'react';
import validator from 'validator';
import axios from 'axios';

import { Page, Svg, Line, Text, View, Link, Document, StyleSheet, Font } from '@react-pdf/renderer';
import { PDFDownloadLink } from '@react-pdf/renderer';

import countryCodes from './resources/country_codes.json';

interface CountryStatus {
  is_us?: boolean;
  is_canada?: boolean;
  is_eu?: boolean;
  is_gb?: boolean;
  is_other?: boolean;
  is_outside_uk?: boolean;
}

function getCountryStatus(countries: Record<string, boolean>) {
  let status: CountryStatus = {};

  for (const country in countries) {
    if (country === "US") {
      status["is_us"] = true;
      status["is_outside_uk"] = true;
    }
    else if (country === "CA") {
      status["is_canada"] = true;
      status["is_outside_uk"] = true;
    }
    else if (country === "DE" || country === "FR" || country === "IT" || country === "ES" || country === "NL" || country === "BE" ||
      country === "SE" || country === "AT" || country === "DK" || country === "FI" || country === "IE" || country === "GR" ||
      country === "PT" || country === "CZ" || country === "SK" || country === "HU" || country === "PL" || country === "LT" ||
      country === "LV" || country === "EE" || country === "SI" || country === "CY" || country === "MT" || country === "LU" ||
      country === "BG" || country === "RO" || country === "HR") {
      status["is_eu"] = true;
      status["is_outside_uk"] = true;
    }
    else if (country === "GB") {
      status["is_gb"] = true;
    }
    else {
      status["is_other"] = true;
      status["is_outside_uk"] = true;
    }
  }

  return status;
}

interface GrantDetails {
  identifier?: string;
  url?: string;
  xml_url?: string;
}

// Return whether or not this is a valid grant
function isValidGrant(grant: string, onUpdate: (value: boolean) => void,
  current_grant_details: GrantDetails,
  setGrantDetails: (details: GrantDetails) => void) {

  const grant_details: GrantDetails = {};

  if (grant === "" || grant === undefined || grant === null || grant.length === 0) {
    onUpdate(false);
    setGrantDetails(grant_details);
    return;
  }

  if (grant.length > 16) {
    onUpdate(false);
    setGrantDetails(grant_details);
    return;
  }

  if (grant === current_grant_details.identifier) {
    // we don't need to check the grant again
    console.log("Skipping grant check - already validated");
    onUpdate(true);
    return;
  }

  // look up the UKRI grant using an axios call to the UKRI API
  // if the grant is valid, return true
  // otherwise, return false
  const url = `https://gtr.ukri.org/gtr/api/projects?q=${encodeURIComponent(grant)}`;

  console.log("Looking up grant code: " + grant + " at " + url);

  const config = axios.defaults.headers.common;
  config.Accept = 'application/vnd.rcuk.gtr.json-v7';

  axios.get(url, {
    headers: {
      Accept: 'application/vnd.rcuk.gtr.json-v7'
    }
  }).then((response) => {
    if (response.data.project.length === 0) {
      console.log("No matching grant found?");
      onUpdate(false);
      setGrantDetails(grant_details);
      return;
    }
    else {
      try {
        // look for response[0].identifiers.identifier[0].value
        const value = response.data.project[0].identifiers.identifier[0].value;

        if (value === grant) {
          // they match - this is the valid grant code
          grant_details.identifier = value;
          grant_details.url = `https://gtr.ukri.org/projects?ref=${encodeURIComponent(value)}`;

          try {
            grant_details.xml_url = response.data.project[0].href;
          } catch (error) {
            console.log("No XML URL found " + error);
          }

          setGrantDetails(grant_details);
          onUpdate(true);
          return;
        }
        else {
          console.log("Grant code does not match: " + value + " vs " + grant);
          console.log(response.data);
          setGrantDetails(grant_details);
          onUpdate(false);
          return;
        }
      }
      catch (error) {
        console.log("Invalid grant");
        console.log(response.data);
        console.log(error);
        setGrantDetails(grant_details);
        onUpdate(false);
        return;
      }
    }
  })
    .catch((error) => {
      console.log("Cannot reach UKRI API");
      console.log(error);
      setGrantDetails(grant_details);
      onUpdate(false);
      return;
    });
}

function handleCountryChange(countryCode: string, checked: boolean,
  countries: Record<string, boolean>,
  onUpdate: (countries: Record<string, boolean>) => void) {
  if (checked) {
    countries[countryCode] = true;
  }
  else {
    delete countries[countryCode];
  }

  onUpdate(countries);
}

function handleBooleanStringChange(checked: string, onUpdate: (value: number) => void) {
  if (checked === "yes") {
    onUpdate(1);
  }
  else {
    onUpdate(0);
  }
}

function handleNumberStringChange(level: string, onUpdate: (value: number) => void) {
  onUpdate(parseInt(level));
}

function handleSectorChange(sector: string, checked: boolean,
  sectors: Record<string, boolean>,
  onUpdate: (sectors: Record<string, boolean>) => void) {
  if (checked) {
    if (sector === "None") {
      sectors = { "None": true };

      // clear all of the checkboxes
      const checkboxes = document.querySelectorAll('input[name="sectors"]');
      for (let i = 0; i < checkboxes.length; i++) {
        const checkbox = checkboxes[i] as HTMLInputElement;
        if (checkbox.value !== "None") {
          checkbox.checked = false;
        }
      }
    }
    else {
      sectors[sector] = true;

      // clear the "None" checkbox
      const noneCheckbox = document.querySelector('input[name="sectors"][value="None"]');

      if (noneCheckbox !== null) {
        (noneCheckbox as HTMLInputElement).checked = false;
      }

      delete sectors["None"];
    }
  }
  else {
    delete sectors[sector];
  }

  onUpdate(sectors);
}

///
/// React components
///

interface Warnings {
  email?: string;
  project_title?: string;
  project_abstract?: string;
  institution?: string;
  grant?: string;
  countries_institution?: string;
  countries_project?: string;
  data?: string;
  trl?: string;
  sectors?: string;
  validation?: string;
}

interface EmailDialogProps {
  value: string;
  onUpdate: (value: string) => void;
  warnings: Warnings;
}

function EmailDialog({ value, onUpdate, warnings }: EmailDialogProps) {
  let warning = null;

  if (warnings["email"] !== undefined) {
    warning = <div className="warning">{warnings["email"]}</div>;
  }

  let class_name = "default";

  if (value.length > 0 && !validator.isEmail(value)) {
    class_name = "invalidEmail";
  }

  return (
    <div className="formItem">
      <div className="question">Please enter your email address</div>
      {warning}
      <input className={class_name} type="email" onChange={(obj) => onUpdate(obj.target.value)} value={value} />
    </div>
  );
}

interface ProjectTitleDialogProps {
  value: string;
  onUpdate: (value: string) => void;
  warnings: Warnings;
}

function ProjectTitleDialog({ value, onUpdate, warnings }: ProjectTitleDialogProps) {
  let warning = null;

  if (warnings["project_title"] !== undefined) {
    warning = <div className="warning">{warnings["project_title"]}</div>;
  }

  return (
    <div className="formItem">
      <div className="question">Please enter the title of your project</div>
      {warning}
      <input type="text" onChange={(obj) => onUpdate(obj.target.value)} value={value} />
    </div>
  );
}

interface ProjectAbstractDialogProps {
  value: string;
  onUpdate: (value: string) => void;
  warnings: Warnings;
}

function ProjectAbstractDialog({ value, onUpdate, warnings }: ProjectAbstractDialogProps) {
  let warning = null;

  if (warnings["project_abstract"] !== undefined) {
    warning = <div className="warning">{warnings["project_abstract"]}</div>;
  }

  return (
    <div className="formItem">
      <div className="question">Please enter a description (or abstract) of your project</div>
      {warning}
      <textarea onChange={(obj) => onUpdate(obj.target.value)} value={value} />
    </div>
  );
}

interface InstitutionDialogProps {
  value: string;
  onUpdate: (value: string) => void;
  warnings: Warnings;
}

function InstitutionDialog({ value, onUpdate, warnings }: InstitutionDialogProps) {
  let warning = null;

  if (warnings["institution"] !== undefined) {
    warning = <div className="warning">{warnings["institution"]}</div>;
  }

  return (
    <div className="formItem">
      <div className="question">Please enter the legal name of the institution (e.g. University)
        that is responsible for this project</div>
      {warning}
      <input type="text" onChange={(obj) => onUpdate(obj.target.value)} value={value} />
    </div>
  );
}

interface GrantDialogProps {
  value: string;
  onUpdate: (value: string) => void;
  grant_details: GrantDetails;
  warnings: Warnings;
}

function GrantDialog({ value, onUpdate, grant_details, warnings }: GrantDialogProps) {
  let warning = null;

  if (warnings["grant"] !== undefined) {
    warning = <div className="warning">{warnings["grant"]}</div>;
  }

  let details = null;

  if (grant_details.identifier !== undefined) {
    details = (
      <div className="grantDetails">
        <div className="grantSuccess">
          <a href={grant_details.url} target="_blank">Validated {grant_details.identifier}</a>.
          <a href={grant_details.xml_url} target="_blank">View metadata.</a>
        </div>
      </div>
    );
  }

  return (
    <div className="formItem">
      <div className="question">If your project has a UKRI grant code associated with it, please
        enter it here. Only enter a single grant code. If your project does not have a
        UKRI grant associated, then leave this field blank.
      </div>
      {warning}
      <input type="text" onChange={(obj) => onUpdate(obj.target.value)} value={value} />
      {details}
    </div>
  );
}

interface CountryInstitutionDialogProps {
  value: Record<string, boolean>;
  onUpdate: (value: Record<string, boolean>) => void;
  warnings: Warnings;
}

function CountryInstitutionDialog({ value, onUpdate, warnings }: CountryInstitutionDialogProps) {
  let warning = null;

  if (warnings["countries_institution"] !== undefined) {
    warning = <div className="warning">{warnings["countries_institution"]}</div>;
  }

  return (
    <div className="formItem">
      <div className="question">Which country/ies does the institution(s) (e.g. Universities and partner
        entities) involved in the project have a presence in? Please
        select ALL that apply
      </div>
      {warning}
      <div className="countryCheckboxes">
        {countryCodes.map((country) => (
          <div key={country['Country code']}>
            <input type="checkbox" id={`country-institution-${country['Country code']}`} name="countries" value={country['Name']}
              onChange={(state) => handleCountryChange(country['Country code'], state.target.checked, value, onUpdate)} />
            <label className="checkboxLabel" htmlFor={`country-institution-${country['Country code']}`}>{country['Name']}</label>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CountryProjectDialogProps {
  value: Record<string, boolean>;
  onUpdate: (value: Record<string, boolean>) => void;
  warnings: Warnings;
}

function CountryProjectDialog({ value, onUpdate, warnings }: CountryProjectDialogProps) {
  let warning = null;

  if (warnings["countries_project"] !== undefined) {
    warning = <div className="warning">{warnings["countries_project"]}</div>;
  }

  return (
    <div className="formItem">
      <div className="question">Which country/ies are you intending to conduct access to Isambard
        services from? Please select ALL that apply
      </div>
      {warning}
      <div className="countryCheckboxes">
        {countryCodes.map((country) => (
          <div key={country['Country code']}>
            <input type="checkbox" id={`country-project-${country['Country code']}`} name="countries" value={country['Name']}
              onChange={(state) => handleCountryChange(country['Country code'], state.target.checked, value, onUpdate)} />
            <label className="checkboxLabel" htmlFor={`country-project-${country['Country code']}`}>{country['Name']}</label>
          </div>
        ))}
      </div>
    </div>
  );
}

interface DataDialogProps {
  value: number;
  onUpdate: (value: number) => void;
  warnings: Warnings;
}

function DataDialog({ value, onUpdate, warnings }: DataDialogProps) {
  let warning = null;

  if (warnings["data"] !== undefined) {
    warning = <div className="warning">{warnings["data"]}</div>;
  }

  return (
    <div className="formItem">
      <div className="question">Does any of the data loaded into Isambard services originate
        from the USA?
      </div>
      {warning}
      <div className="radioboxes">
        <div className="radiobox">
          <input type="radio" id="yes" name="data" value="yes"
            checked={value === 1}
            onChange={(checked) => handleBooleanStringChange(checked.target.value, onUpdate)} />
          <label className="radioLabel" htmlFor="yes">Yes</label>
        </div>
        <div className="radiobox">
          <input type="radio" id="no" name="data" value="no"
            checked={value === 0}
            onChange={(checked) => handleBooleanStringChange(checked.target.value, onUpdate)} />
          <label className="radioLabel" htmlFor="no">No</label>
        </div>
      </div>
    </div>
  );
}

interface TRLDialogProps {
  value: number;
  onUpdate: (value: number) => void;
  warnings: Warnings;
}

function TRLDialog({ value, onUpdate, warnings }: TRLDialogProps) {
  let warning = null;

  if (warnings["trl"] !== undefined) {
    warning = <div className="warning">{warnings["trl"]}</div>;
  }

  return (
    <div className="formItem">
      <div className="question">What is the highest expected Technology Readiness Level (TRL) of the outputs of this project?</div>
      {warning}
      <div className="radioboxes">
        <div className="radiobox">
          <input type="radio" id="trl1" name="trl" value="1"
            checked={value === 1}
            onChange={(checked) => handleNumberStringChange(checked.target.value, onUpdate)} />
          <label className="radioLabel" htmlFor="trl1">TRL 1: Basic principle observed and reported</label>
        </div>
        <div className="radiobox">
          <input type="radio" id="trl2" name="trl" value="2"
            checked={value === 2}
            onChange={(checked) => handleNumberStringChange(checked.target.value, onUpdate)} />
          <label className="radioLabel" htmlFor="trl2">TRL 2: Technology concept and/or application formed</label>
        </div>
        <div className="radiobox">
          <input type="radio" id="trl3" name="trl" value="3"
            checked={value === 3}
            onChange={(checked) => handleNumberStringChange(checked.target.value, onUpdate)} />
          <label className="radioLabel" htmlFor="trl3">TRL 3: Analytical and experimental critical function and/or characteristic proof of concept</label>
        </div>
        <div className="radiobox">
          <input type="radio" id="trl4" name="trl" value="4"
            checked={value === 4}
            onChange={(checked) => handleNumberStringChange(checked.target.value, onUpdate)} />
          <label className="radioLabel" htmlFor="trl4">TRL 4: Technology / component validation in a lab environment</label>
        </div>
        <div className="radiobox">
          <input type="radio" id="trl5" name="trl" value="5"
            checked={value === 5}
            onChange={(checked) => handleNumberStringChange(checked.target.value, onUpdate)} />
          <label className="radioLabel" htmlFor="trl5">TRL 5: Technology / component validated in relevant environment</label>
        </div>
        <div className="radiobox">
          <input type="radio" id="trl6" name="trl" value="6"
            checked={value === 6}
            onChange={(checked) => handleNumberStringChange(checked.target.value, onUpdate)} />
          <label className="radioLabel" htmlFor="trl6">TRL 6: System and subsystems model of prototype demonstration in relevant environment</label>
        </div>
        <div className="radiobox">
          <input type="radio" id="trl7" name="trl" value="7"
            checked={value === 7}
            onChange={(checked) => handleNumberStringChange(checked.target.value, onUpdate)} />
          <label className="radioLabel" htmlFor="trl7">TRL 7: System prototype demonstration in an operational environment</label>
        </div>
        <div className="radiobox">
          <input type="radio" id="trl8" name="trl" value="8"
            checked={value === 8}
            onChange={(checked) => handleNumberStringChange(checked.target.value, onUpdate)} />
          <label className="radioLabel" htmlFor="trl8">TRL 8: Actual system completed and qualified through testing</label>
        </div>
        <div className="radiobox">
          <input type="radio" id="trl9" name="trl" value="9"
            checked={value === 9}
            onChange={(checked) => handleNumberStringChange(checked.target.value, onUpdate)} />
          <label className="radioLabel" htmlFor="trl9">TRL 9: Actual system field proven through successful operation</label>
        </div>
      </div>
    </div>
  );
}

interface SectorDialogProps {
  value: Record<string, boolean>;
  onUpdate: (value: Record<string, boolean>) => void;
  warnings: Warnings;
}

function SectorDialog({ value, onUpdate, warnings }: SectorDialogProps) {
  let warning = null;

  if (warnings["sectors"] !== undefined) {
    warning = <div className="warning">{warnings["sectors"]}</div>;
  }

  return (
    <div className="formItem">
      <div className="question">Does the project relate to any of these sectors? Please
        select ALL that apply. Note, if none of these sectors apply
        to your project, please select &quot;None of the above&quot;
      </div>
      {warning}
      <div className="sectorCheckboxes">
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector1" name="sectors" value="Advanced Materials"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label className="checkboxLabel" htmlFor="sector1">Advanced Materials</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector2" name="sectors" value="Advanced Robotics"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label className="checkboxLabel" htmlFor="sector2">Advanced Robotics</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector3" name="sectors" value="Artificial Intelligence"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label className="checkboxLabel" htmlFor="sector3">Artificial Intelligence</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector4" name="sectors" value="Civil Nuclear"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label className="checkboxLabel" htmlFor="sector4">Civil Nuclear</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector5" name="sectors" value="Communications"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label className="checkboxLabel" htmlFor="sector5">Communications</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector6" name="sectors" value="Computing Hardware"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label className="checkboxLabel" htmlFor="sector6">Computing Hardware</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector7" name="sectors" value="Critical Suppliers to Government"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label className="checkboxLabel" htmlFor="sector7">Critical Suppliers to Government</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector8" name="sectors" value="Cryptographic Authentication"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label className="checkboxLabel" htmlFor="sector8">Cryptographic Authentication</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector9" name="sectors" value="Data Infrastructure"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label className="checkboxLabel" htmlFor="sector9">Data Infrastructure</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector10" name="sectors" value="Defence"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label className="checkboxLabel" htmlFor="sector10">Defence</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector11" name="sectors" value="Energy"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label className="checkboxLabel" htmlFor="sector11">Energy</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector12" name="sectors" value="Military and Dual-Use"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label className="checkboxLabel" htmlFor="sector12">Military and Dual-Use</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector13" name="sectors" value="Quantum Technologies"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label className="checkboxLabel" htmlFor="sector13">Quantum Technologies</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector14" name="sectors" value="Satellite and Space Technologies"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label className="checkboxLabel" htmlFor="sector14">Satellite and Space Technologies</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector15" name="sectors" value="Suppliers to the Emergency Services"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label className="checkboxLabel" htmlFor="sector15">Suppliers to the Emergency Services</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector16" name="sectors" value="Synthetic Biology"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label className="checkboxLabel" htmlFor="sector16">Synthetic Biology</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector17" name="sectors" value="Transport"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label className="checkboxLabel" htmlFor="sector17">Transport</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector18" name="sectors" value="None"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label className="checkboxLabel" htmlFor="sector18">None of the above</label>
        </div>
      </div>
    </div>
  );
}

interface ValidateButtonProps {
  onValidate: () => void;
  warnings: Warnings;
}

function ValidateButton({ onValidate, warnings }: ValidateButtonProps) {
  if (warnings["validation"] !== undefined) {
    return (
      <div className="buttonContainer">
        <div className="warning">{warnings["validation"]}</div>
        <button className="validateButton" onClick={onValidate}>Validate</button>
      </div>
    );
  }
  else {
    return (
      <button className="validateButton" onClick={onValidate}>Validate</button>
    );
  }
}

interface GenerateButtonProps {
  report: Element;
}

function GenerateButton({ report }: GenerateButtonProps) {
  return (
    <div className="buttonContainer">
      <PDFDownloadLink className="generateButton" document={report} fileName="isambard-compliance.pdf">
        {({ blob, url, loading, error }) =>
          loading ? 'Generating Complicance Report...' : 'Download Compliance Report'
        }
      </PDFDownloadLink>
    </div>
  )
}

///
/// The actual application
///

export default function MyApp() {
  ///
  /// Functions / model used to handle state
  ///

  const [email, setEmail] = useState("");
  const [project_title, setProjectTitle] = useState("");
  const [project_abstract, setProjectAbstract] = useState("");
  const [institution, setInstitution] = useState("");
  const [grant, setGrant] = useState("");
  const [countries_institution, setCountriesInstitution] = useState({});
  const [countries_project, setCountriesProject] = useState({});
  const [data, setData] = useState(-1);
  const [trl, setTrl] = useState(0);
  const [sectors, setSectors] = useState({});
  const [show_advanced, setShowAdvanced] = useState(false);
  const [show_sectors, setShowSectors] = useState(false);
  const [grant_details, setGrantDetails] = useState({});
  const [show_generate, setShowGenerate] = useState(false);

  const [warnings, setWarnings] = useState<Warnings>({});

  let sector_dialog = null;

  if (show_sectors) {
    const changedSectors = (sectors: Record<string, boolean>) => {
      setShowGenerate(false);
      setSectors(sectors);
    };

    sector_dialog = <SectorDialog value={sectors} onUpdate={changedSectors} warnings={warnings} />;
  }

  let advanced_dialog = null;

  if (show_advanced) {
    const setCheckedTrl = (level: number) => {
      setTrl(level);

      if (level >= 3) {
        setShowSectors(true);
      }
      else {
        setShowSectors(false);
      }
    }

    const changedCountriesInstitution = (countries: Record<string, boolean>) => {
      setShowGenerate(false);
      setCountriesInstitution(countries);
    }

    const changedCountriesProject = (countries: Record<string, boolean>) => {
      setShowGenerate(false);
      setCountriesProject(countries);
    }

    const changedData = (value: number) => {
      setShowGenerate(false);
      setData(value);
    }

    const changedTrl = (level: number) => {
      setShowGenerate(false);
      setCheckedTrl(level);
    }

    advanced_dialog = (
      <div className="advancedForm">
        <div className="advancedTitle">We need more details because we can&apos;t validate the grant
          (or it is not specified)
        </div>
        <CountryInstitutionDialog value={countries_institution} onUpdate={changedCountriesInstitution} warnings={warnings} />
        <CountryProjectDialog value={countries_project} onUpdate={changedCountriesProject} warnings={warnings} />
        <DataDialog value={data} onUpdate={changedData} warnings={warnings} />
        <TRLDialog value={trl} onUpdate={changedTrl} warnings={warnings} />
        {sector_dialog}
      </div>
    );
  }

  // this may be updated by the grant validation function
  let local_grant = grant;

  const onCheckGrant = () => {

    const onUpdate = (value: boolean) => {
      if (value) {
        onValidate(true);
      } else {
        onValidate(false);
      }
    }

    isValidGrant(local_grant, onUpdate, grant_details, setGrantDetails);
  }

  const onValidate = (grant_is_valid: boolean) => {
    const warnings: Warnings = {};
    let is_valid = true;

    if (!validator.isEmail(email)) {
      warnings["email"] = "You must enter a valid email address";
      is_valid = false;
    }

    if (project_title === "") {
      warnings["project_title"] = "You must enter a project title";
      is_valid = false;
    }

    if (project_abstract === "") {
      warnings["project_abstract"] = "You must enter a project abstract";
      is_valid = false;
    }

    if (institution === "") {
      warnings["institution"] = "You must enter an institution";
      is_valid = false;
    }

    let should_show_advanced = show_advanced;

    if (grant_is_valid) {
      setShowAdvanced(false);
      should_show_advanced = false;
      delete warnings["grant"];
    }
    else if (!show_advanced) {
      // this is the first time we haven't specified the grant
      is_valid = false;
      warnings["grant"] = "Invalid grant code";
      should_show_advanced = true;
      setShowAdvanced(true);
    }

    if (should_show_advanced) {
      if (Object.keys(countries_institution).length === 0) {
        warnings["countries_institution"] = "You must select at least one country for the institution";
        is_valid = false;
      }

      if (Object.keys(countries_project).length === 0) {
        warnings["countries_project"] = "You must select at least one country for the project";
        is_valid = false;
      }

      if (data === -1) {
        warnings["data"] = "You must say whether data originates from the USA";
        is_valid = false;
      }

      if (trl === 0) {
        warnings["trl"] = "You must select the TRL level";
        is_valid = false;
      }

      if (show_sectors) {
        if (Object.keys(sectors).length === 0) {
          warnings["sectors"] = "You must select at least one sector";
          is_valid = false;
        }
      }
    }

    if (is_valid) {
      delete warnings["validation"];
      setShowGenerate(true);
    } else {
      warnings["validation"] = "The form is not valid - please fix the errors above to continue";
      setShowGenerate(false);
    }

    setWarnings(warnings);
  }

  let generate_button = null;
  let validate_button = null;

  if (show_generate) {
    // generate the pdf document and attach it to the download button
    let advanced_section = null;
    let grant_section = null;

    let green_flagged = true;

    if (grant !== "") {
      if (grant_details.url === undefined) {
        grant_section = (
          <Text>Grant code: {grant} &nbsp;<Text style={{ color: "red" }}>NOT VALIDATED</Text></Text>
        )
      }
      else {
        grant_section = (
          <Text><Link src={grant_details.url}>{grant}</Link>&nbsp;
            &nbsp; <Link src={grant_details.xml_url}>metadata</Link>
          </Text>
        );
      }
    }

    if (show_advanced) {
      const countries_institution_list = Object.keys(countries_institution).join(", ");
      const countries_project_list = Object.keys(countries_project).join(", ");
      const sectors_list = Object.keys(sectors).join(", ");

      let data_text = "No";

      // we need to assess if this is green-flagged

      // go through each of the countries and see if they are not in the
      // automatically approved list
      const institution_status = getCountryStatus(countries_institution);

      if (institution_status.is_other) {
        // need to review requests for projects hosted
        // outside UK, EU, USA and Canada
        green_flagged = false;
      }

      const project_status = getCountryStatus(countries_project);

      if (project_status.is_other || project_status.is_us || project_status.is_canada) {
        // need to review requests for projects accessing from
        // outside of UK or EU

        // (USA and Canada because of potential for export control issues)
        green_flagged = false;
      }

      if (data === 1) {
        // Data from the US may be subject to export control
        data_text = "Yes";
        green_flagged = false;
      }

      if (sectors["None"] === undefined) {
        // we need to review if the TRL is 3 or above
        if (trl >= 3) {
          if (institution_status.is_outside_uk || project_status.is_outside_uk) {
            // need to review projects with TRL >= 3
            // that are hosted or accessed from outside the UK
            green_flagged = false;
          }
        }
      }

      let sectors_section = null;

      if (sectors_list !== "") {
        sectors_section = (
          <Text>Sectors: {sectors_list}</Text>
        );
      }

      advanced_section = (
        <View>
          <Text>Country/ies of institution: {countries_institution_list}</Text>
          <Text>Country/ies that will access the project: {countries_project_list}</Text>
          <Text>   </Text>
          <Text>Contains data from USA: {data_text}</Text>
          <Text>   </Text>
          <Text>Technical Readiness Level: {trl}</Text>
          {sectors_section}
        </View>
      );
    }

    const styles = StyleSheet.create({
      page: {
        backgroundColor: 'white', flexDirection: 'column',
        size: "A4",
      },
      section: {
        textAlign: 'left', margin: 30,
        padding: 10, flexGrow: 1,
        fontSize: "10pt",
        fontFamily: 'Helvetica',
        lineHeight: 1.5,
      }
    });

    let next_step = null;

    if (green_flagged) {
      next_step = (
        <Text style={{ color: "green", fontSize: "12pt" }}>
          Please download and save this PDF and upload it with your research application
        </Text>
      );
    }
    else {
      next_step = (
        <Text style={{ color: "red", fontSize: "12pt" }}>
          Please download and save this PDF and email it to your research office,
          together with a copy of your project proposal. They will be able
          to advise whether you need to take any further action before
          submitting your research application.
        </Text>
      );
    }

    const compliance_report = (
      <Document title="Isambard Compliance Assessment"
        author="Isambard Compliance Tool"
        subject="Isambard Compliance Assessment"
      >
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text style={{ fontSize: "14pt" }}>Isambard Compliance Assessment</Text>
            <Text>   </Text>
            <Svg height="5" width="100%">
              <Line x1="0" y1="0" x2="500" y2="0" strokeWidth={2} stroke="rgb(150,150,150)" />
            </Svg>
            {next_step}
            <Svg height="2" width="100%">
              <Line x1="0" y1="0" x2="500" y2="0" strokeWidth={2} stroke="rgb(150,150,150)" />
            </Svg>
            <Text>   </Text>
            <Text>{email.trim()}</Text>
            <Text>{institution.trim()}</Text>
            {grant_section}
            {advanced_section}
            <Text>   </Text>
            <Svg height="5" width="100%">
              <Line x1="0" y1="0" x2="500" y2="0" strokeWidth={2} stroke="rgb(150,150,150)" />
            </Svg>
            <Text style={{ color: "rgb(50,50,50)", fontSize: "12pt" }}>{project_title.trim()}</Text>
            <Text>   </Text>
            <Text>{project_abstract.trim()}</Text>
            <Text>   </Text>
            <Svg height="5" width="100%">
              <Line x1="0" y1="0" x2="500" y2="0" strokeWidth={2} stroke="rgb(150,150,150)" />
            </Svg>
          </View>
        </Page>
      </Document >
    );

    generate_button = <GenerateButton report={compliance_report} />
  }
  else {
    validate_button = <ValidateButton onValidate={onCheckGrant} warnings={warnings} />;
  }

  const changedEmail = (value: string) => {
    setShowGenerate(false);
    setEmail(value);
  };

  const changedProjectTitle = (value: string) => {
    setShowGenerate(false);
    setProjectTitle(value);
  };

  const changedProjectAbstract = (value: string) => {
    setShowGenerate(false);
    setProjectAbstract(value);
  };

  const changedInstitution = (value: string) => {
    setShowGenerate(false);
    setInstitution(value);
  };

  const changedGrant = (value: string) => {
    value = value.trim();
    setShowGenerate(false);
    setGrant(value);
    local_grant = value;
  };

  return (
    <div className="page">
      <div className="pageTitle">Isambard Compliance Assessment Form</div>
      <div className="form">
        <EmailDialog value={email} onUpdate={changedEmail} warnings={warnings} />
        <ProjectTitleDialog value={project_title} onUpdate={changedProjectTitle} warnings={warnings} />
        <ProjectAbstractDialog value={project_abstract} onUpdate={changedProjectAbstract} warnings={warnings} />
        <InstitutionDialog value={institution} onUpdate={changedInstitution} warnings={warnings} />
        <GrantDialog value={grant} onUpdate={changedGrant} grant_details={grant_details} warnings={warnings} />
        {advanced_dialog}
        {validate_button}
        {generate_button}
      </div>
    </div>
  );
}

