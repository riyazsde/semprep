import React, { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { SlCloudUpload } from "react-icons/sl";
import {
  getAllSubjects,
} from "./exportFunctions";
import { uploadTestSeriesFile, uploadInstructionFile } from "./otherFunction";
import FormComponent from "./StudyPlannerFormComponent";

const TestSeriesNewComponent = ({ goalCategory, goalExamId, setFormData }) => {
  const [formSubjects, setFormSubjects] = useState({
    option1: [],
    option2: [],
    option3: [],
    option4: [],
  });

  const [selectedOption, setSelectedOption] = useState("option1");
  const [fileData, setFileData] = useState({
    option1: [],
    option2: [],
    option3: [],
    option4: [],
  });
  const [subjectOptions, setSubjectOptions] = useState([]);

  const { register, handleSubmit, control } = useForm();
  const testFieldArrays = {
    option1: useFieldArray({ control, name: "option1Subjects" }),
    option2: useFieldArray({ control, name: "option2Subjects" }),
    option3: useFieldArray({ control, name: "option3Subjects" }),
    option4: useFieldArray({ control, name: "option4Subjects" }),
  };

  useEffect(() => {
    if (goalExamId) {
      const params = {
        goalCategory,
        goalId: goalExamId,
        page: 1,
        limit: 100,
        search: "",
      };

      getAllSubjects({
        setData: (data) =>
          setSubjectOptions(Array.isArray(data?.data) ? data?.data : []),
        params,
      });
    }
  }, [goalExamId, goalCategory]);

  const uploadAndSetInstructionFileId = async (testType, index, file) => {
    try {
      const fileId = await uploadInstructionFile({ data: file });
      setFileData((prev) => {
        const updatedFileData = [...prev[testType]];
        updatedFileData[index] = {
          ...updatedFileData[index],
          instructionFile: fileId,
        };
        return { ...prev, [testType]: updatedFileData };
      });
    } catch (error) {
      console.error("Instruction file upload failed", error);
    }
  };

  const uploadAndSetTestSeriesFileId = async (testType, index, file) => {
    try {
      const fileId = await uploadTestSeriesFile({ data: file });
      setFileData((prev) => {
        const updatedFileData = [...prev[testType]];
        updatedFileData[index] = {
          ...updatedFileData[index],
          testSeriesFile: fileId,
        };
        return { ...prev, [testType]: updatedFileData };
      });
    } catch (error) {
      console.error("Test series file upload failed", error);
    }
  };

  const generateOutput = (data) => {
    const testTypes = {
      option1: "Mock Test",
      option2: "Subject Test",
      option3: "Chapter Test",
      option4: "Partial Test",
    };

    const output = Object.keys(testTypes).flatMap((key) => {
      const fieldsArray = data[`${key}Subjects`] || [];
      return fieldsArray.map((fieldEntry, index) => {
        const instructionFile = fileData[key][index]?.instructionFile || "";
        const testSeriesFile = fileData[key][index]?.testSeriesFile || "";
        return {
          testType: testTypes[key],
          testCost: "Free",
          subjects: formSubjects[key] || [],
          testSeriesFiles: [
            {
              instructionFile,
              testSeriesFile,
            },
          ],
        };
      });
    });

    console.log("Generated Output:", output);
    return output;
  };

  const FileUpload = ({ file, setFile, label, inputId, uploadFunction }) => (
    <div className="addhandwritten-input mt-4 mb-4">
      <h6>{label}</h6>
      <div className="addcourse-upload-file">
        {file ? (
          <p
            onClick={() => document.getElementById(inputId).click()}
            style={{
              cursor: "pointer",
              color: "blue",
              textDecoration: "underline",
            }}
          >
            {label} Uploaded
          </p>
        ) : (
          <SlCloudUpload
            style={{ cursor: "pointer" }}
            onClick={() => document.getElementById(inputId).click()}
          />
        )}
        <input
          type="file"
          id={inputId}
          style={{ display: "none" }}
          onChange={async (e) => {
            const file = e.target.files[0];
            if (file) {
              setFile(file);
              await uploadFunction(file);
            }
          }}
        />
      </div>
    </div>
  );

  const renderTestFields = (testType) => {
    const { fields, append, remove } = testFieldArrays[testType];

    return (
      <>
        {fields.map((field, index) => (
          <div key={field.id}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              <FileUpload
                file={fileData[testType][index]?.instructionFile}
                setFile={(file) => uploadAndSetInstructionFileId(testType, index, file)}
                label="Instruction File"
                inputId={`${testType}_instruction_${index}`}
                uploadFunction={(file) => uploadAndSetInstructionFileId(testType, index, file)}
              />
              <FileUpload
                file={fileData[testType][index]?.testSeriesFile}
                setFile={(file) => uploadAndSetTestSeriesFileId(testType, index, file)}
                label="Upload Test Series"
                inputId={`${testType}_testSeries_${index}`}
                uploadFunction={(file) => uploadAndSetTestSeriesFileId(testType, index, file)}
              />
            </div>
            <FormComponent
              goalCategory={goalCategory}
              goalExamId={goalExamId}
              setFormSubjects={(subjects) =>
                setFormSubjects((prev) => ({
                  ...prev,
                  [testType]: subjects,
                }))
              }
            />
            <button type="button" style={{marginTop:"30px"}} onClick={() => remove(index)}>
              Delete
            </button>
          </div>
        ))}
        <button 
          type="button"
          onClick={() => {
            append({ subjects: formSubjects[testType] });
            setFileData((prev) => ({
              ...prev,
              [testType]: [
                ...prev[testType],
                { instructionFile: null, testSeriesFile: null },
              ],
            }));
          }}
        >
          Add More Test 

        </button>
      </>
    );
  };

  const onSubmit = (data) => setFormData(generateOutput(data));

  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="addhandwritten-input-two-div">
        <div className="addhandwritten-input">
          <h6>
            Select type of Test<span>*</span>
          </h6>
          <div className="addcourse-radios-btns">
            {[
              "Mock Test",
              "Subject Test",
              "Chapter Test",
              "Partial Test",
            ].map((label, index) => {
              const value = `option${index + 1}`;
              return (
                <div className="addcourse-radios" key={value}>
                  <input
                    type="radio"
                    value={value}
                    checked={selectedOption === value}
                    onChange={() => setSelectedOption(value)}
                  />
                  <p>{label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {renderTestFields(selectedOption)}
      <button type="button" onClick={handleSubmit(onSubmit)}>
        Submit
      </button>
    </form>
  );
};

export default TestSeriesNewComponent;
