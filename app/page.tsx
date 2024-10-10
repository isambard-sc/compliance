'use client'

import { useState } from 'react';
import validator from 'validator';

import ReactPDF, { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import ReactDOM from 'react-dom';
import { PDFViewer } from '@react-pdf/renderer';

import countryCodes from './resources/country_codes.json';

///
/// Functions that handle changes in state
///

function isValidGrant(grant: string) {
  if (grant === "") {
    return false;
  }

  return true;
}

function handleCountryChange(countryCode: string, checked: boolean, countries, onUpdate) {
  if (checked) {
    countries[countryCode] = true;
  }
  else {
    delete countries[countryCode];
  }

  onUpdate(countries);
}

function handleBooleanStringChange(checked: string, onUpdate) {
  if (checked === "yes") {
    onUpdate(1);
  }
  else {
    onUpdate(0);
  }
}

function handleNumberStringChange(level: string, onUpdate) {
  onUpdate(parseInt(level));
}

function handleSectorChange(sector: string, checked: boolean, sectors, onUpdate) {
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

function EmailDialog({ value, onUpdate, warnings, email_is_valid, setEmailIsValid }) {
  let warning = null;

  if (warnings["email"] !== undefined) {
    warning = <div className="warning">{warnings["email"]}</div>;
  }

  const textChanged = (value: string) => {
    if (validator.isEmail(value)) {
      setEmailIsValid(true);
    }
    else {
      setEmailIsValid(false);
    }
    onUpdate(value);
  };

  let class_name = "default";

  if (value.length > 0 && !validator.isEmail(value)) {
    class_name = "invalidEmail";
  }

  return (
    <div className="formItem">
      <div className="question">Please enter your email address</div>
      {warning}
      <input className={class_name} type="email" onChange={(obj) => textChanged(obj.target.value)} value={value} />
    </div>
  );
}

function ProjectTitleDialog({ value, onUpdate, warnings }) {
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

function ProjectAbstractDialog({ value, onUpdate, warnings }) {
  let warning = null;

  if (warnings["project_abstract"] !== undefined) {
    warning = <div className="warning">{warnings["project_abstract"]}</div>;
  }

  return (
    <div className="formItem">
      <div className="question">Please enter a description (or abstract) of your project</div>
      {warning}
      <input type="text" onChange={(obj) => onUpdate(obj.target.value)} value={value} />
    </div>
  );
}

function InstitutionDialog({ value, onUpdate, warnings }) {
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

function GrantDialog({ value, onUpdate, warnings }) {
  let warning = null;

  if (warnings["grant"] !== undefined) {
    warning = <div className="warning">{warnings["grant"]}</div>;
  }

  return (
    <div className="formItem">
      <div className="question">If your project has a UKRI grant code associated with it, please
        enter it here. Otherwise, leave this field blank.
      </div>
      {warning}
      <input type="text" onChange={(obj) => onUpdate(obj.target.value)} value={value} />
    </div>
  );
}

function CountryInstitutionDialog({ value, onUpdate, warnings }) {
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

function CountryProjectDialog({ value, onUpdate, warnings }) {
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

function DataDialog({ value, onUpdate, warnings }) {
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
            onChange={(checked) => handleBooleanStringChange(checked.target.value, onUpdate)} />
          <label className="radioLabel" htmlFor="yes">Yes</label>
        </div>
        <div className="radiobox">
          <input type="radio" id="no" name="data" value="no"
            onChange={(checked) => handleBooleanStringChange(checked.target.value, onUpdate)} />
          <label className="radioLabel" htmlFor="no">No</label>
        </div>
      </div>
    </div>
  );
}

function TRLDialog({ value, onUpdate, warnings }) {
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
            onChange={(checked) => handleNumberStringChange(checked.target.value, onUpdate)} />
          <label className="radioLabel" htmlFor="trl1">TRL 1: Basic principle observed and reported</label>
        </div>
        <div className="radiobox">
          <input type="radio" id="trl2" name="trl" value="2"
            onChange={(checked) => handleNumberStringChange(checked.target.value, onUpdate)} />
          <label className="radioLabel" htmlFor="trl2">TRL 2: Technology concept and/or application formed</label>
        </div>
        <div className="radiobox">
          <input type="radio" id="trl3" name="trl" value="3"
            onChange={(checked) => handleNumberStringChange(checked.target.value, onUpdate)} />
          <label className="radioLabel" htmlFor="trl3">TRL 3: Analytical and experimental critical function and/or characteristic proof of concept</label>
        </div>
        <div className="radiobox">
          <input type="radio" id="trl4" name="trl" value="4"
            onChange={(checked) => handleNumberStringChange(checked.target.value, onUpdate)} />
          <label className="radioLabel" htmlFor="trl4">TRL 4: Technology / component validation in a lab environment</label>
        </div>
        <div className="radiobox">
          <input type="radio" id="trl5" name="trl" value="5"
            onChange={(checked) => handleNumberStringChange(checked.target.value, onUpdate)} />
          <label className="radioLabel" htmlFor="trl5">TRL 5: Technology / component validated in relevant environment</label>
        </div>
        <div className="radiobox">
          <input type="radio" id="trl6" name="trl" value="6"
            onChange={(checked) => handleNumberStringChange(checked.target.value, onUpdate)} />
          <label className="radioLabel" htmlFor="trl6">TRL 6: System and subsystems model of prototype demonstration in relevant environment</label>
        </div>
        <div className="radiobox">
          <input type="radio" id="trl7" name="trl" value="7"
            onChange={(checked) => handleNumberStringChange(checked.target.value, onUpdate)} />
          <label className="radioLabel" htmlFor="trl7">TRL 7: System prototype demonstration in an operational environment</label>
        </div>
        <div className="radiobox">
          <input type="radio" id="trl8" name="trl" value="8"
            onChange={(checked) => handleNumberStringChange(checked.target.value, onUpdate)} />
          <label className="radioLabel" htmlFor="trl8">TRL 8: Actual system completed and qualified through testing</label>
        </div>
        <div className="radiobox">
          <input type="radio" id="trl9" name="trl" value="9"
            onChange={(checked) => handleNumberStringChange(checked.target.value, onUpdate)} />
          <label className="radioLabel" htmlFor="trl9">TRL 9: Actual system field proven through successful operation</label>
        </div>
      </div>
    </div>
  );
}

function SectorDialog({ value, onUpdate, warnings }) {
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
          <label htmlFor="sector1">Advanced Materials</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector2" name="sectors" value="Advanced Robotics"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label htmlFor="sector2">Advanced Robotics</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector3" name="sectors" value="Artificial Intelligence"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label htmlFor="sector3">Artificial Intelligence</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector4" name="sectors" value="Civil Nuclear"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label htmlFor="sector4">Civil Nuclear</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector5" name="sectors" value="Communications"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label htmlFor="sector5">Communications</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector6" name="sectors" value="Computing Hardware"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label htmlFor="sector6">Computing Hardware</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector7" name="sectors" value="Critical Suppliers to Government"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label htmlFor="sector7">Critical Suppliers to Government</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector8" name="sectors" value="Cryptographic Authentication"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label htmlFor="sector8">Cryptographic Authentication</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector9" name="sectors" value="Data Infrastructure"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label htmlFor="sector9">Data Infrastructure</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector10" name="sectors" value="Defence"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label htmlFor="sector10">Defence</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector11" name="sectors" value="Energy"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label htmlFor="sector11">Energy</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector12" name="sectors" value="Military and Dual-Use"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label htmlFor="sector12">Military and Dual-Use</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector13" name="sectors" value="Quantum Technologies"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label htmlFor="sector13">Quantum Technologies</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector14" name="sectors" value="Satellite and Space Technologies"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label htmlFor="sector14">Satellite and Space Technologies</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector15" name="sectors" value="Suppliers to the Emergency Services"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label htmlFor="sector15">Suppliers to the Emergency Services</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector16" name="sectors" value="Synthetic Biology"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label htmlFor="sector16">Synthetic Biology</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector17" name="sectors" value="Transport"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label htmlFor="sector17">Transport</label>
        </div>
        <div className="sectorCheckbox">
          <input type="checkbox" id="sector18" name="sectors" value="None"
            onChange={(checked) => handleSectorChange(checked.target.value, checked.target.checked, value, onUpdate)} />
          <label htmlFor="sector18">None of the above</label>
        </div>
      </div>
    </div>
  );
}

function ValidateButton({ onValidate }) {
  return (
    <button className="validateButton" onClick={onValidate}>Validate</button>
  );
}

function GenerateButton({ onGenerate, is_valid }) {

  if (is_valid) {
    return (
      <button className="generateButton" onClick={onGenerate}>Generate</button>
    );
  }
  else {
    return null;
  }
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
  const [warnings, setWarnings] = useState({});
  const [is_valid, setIsValid] = useState(false);
  const [email_is_valid, setEmailIsValid] = useState(false);
  const [render_pdf, setRenderPDF] = useState(false);

  let sector_dialog = null;

  if (show_sectors) {
    sector_dialog = <SectorDialog value={sectors} onUpdate={setSectors} warnings={warnings} />;
  }

  let advanced_dialog = null;

  if (show_advanced) {
    let setCheckedTrl = (level: number) => {
      setTrl(level);

      if (level >= 3) {
        setShowSectors(true);
      }
      else {
        setShowSectors(false);
      }
    }

    advanced_dialog = (
      <div className="advancedForm">
        <div className="advancedTitle">We need more details because we can't validate the grant
          (or it is not specified)
        </div>
        <CountryInstitutionDialog value={countries_institution} onUpdate={setCountriesInstitution} warnings={warnings} />
        <CountryProjectDialog value={countries_project} onUpdate={setCountriesProject} warnings={warnings} />
        <DataDialog value={data} onUpdate={setData} warnings={warnings} />
        <TRLDialog value={trl} onUpdate={setCheckedTrl} warnings={warnings} />
        {sector_dialog}
      </div>
    );
  }

  let onValidate = () => {
    let warnings = {};
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

    if (isValidGrant(grant)) {
      setShowAdvanced(false);
      should_show_advanced = false;
      delete warnings["grant"];
    }
    else if (!show_advanced) {
      // this is the first time we haven't specified the grant
      is_valid = false;
      warnings["grant"] = "Invalid grant code";
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

    setWarnings(warnings);
    setIsValid(is_valid);

    return is_valid;
  }

  let onGenerate = () => {
    let is_valid = onValidate();

    if (!is_valid) {
      console.log("Form is not valid - look at the warnings to learn more.");
      return;
    }

    console.log("Form is valid - generating PDF");
    setRenderPDF(true);
  }


  if (render_pdf) {
    let advanced_section = null;
    let grant_section = null;

    let green_flagged = true;

    if (grant !== "") {
      grant_section = (
        <Text>Grant number: {grant}</Text>
      );
    }

    if (show_advanced) {
      let countries_institution_list = Object.keys(countries_institution).join(", ");
      let countries_project_list = Object.keys(countries_project).join(", ");
      let sectors_list = Object.keys(sectors).join(", ");

      let data_text = "No";

      if (data === 1) {
        data_text = "Yes";
        green_flagged = false;
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
      page: { backgroundColor: 'white', flexDirection: 'column' },
      section: {
        textAlign: 'left', margin: 30,
        padding: 10, flexGrow: 1,
        fontSize: "10pt",
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

    return (
      <PDFViewer style={{ width: "100%", height: "100vh" }}>
        <Document>
          <Page size="A4" style={styles.page}>
            <View style={styles.section}>
              <Text style={{ fontSize: "14pt" }}>Isambard Compliance Assessment</Text>
              <Text>   </Text>
              {next_step}
              <Text>   </Text>
              <Text>{email}</Text>
              <Text>{institution}</Text>
              {grant_section}
              <Text>   </Text>
              <Text>{project_title}</Text>
              <Text>   </Text>
              <Text>{project_abstract}</Text>
              <Text>   </Text>
              {advanced_section}
            </View>
          </Page>
        </Document>
      </PDFViewer>
    );
  } else {
    return (
      <div className="page">
        <div className="pageTitle">Isambard Compliance Access Form</div>
        <div className="form">
          <EmailDialog value={email} onUpdate={setEmail} warnings={warnings}
            email_is_valid={email_is_valid} setEmailIsValid={setEmailIsValid} />
          <ProjectTitleDialog value={project_title} onUpdate={setProjectTitle} warnings={warnings} />
          <ProjectAbstractDialog value={project_abstract} onUpdate={setProjectAbstract} warnings={warnings} />
          <InstitutionDialog value={institution} onUpdate={setInstitution} warnings={warnings} />
          <GrantDialog value={grant} onUpdate={setGrant} warnings={warnings} />
          {advanced_dialog}
          <ValidateButton onValidate={onValidate} />
          <GenerateButton onGenerate={onGenerate} is_valid={is_valid} />
        </div>
      </div>
    );
  }
}
