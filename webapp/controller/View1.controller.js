sap.ui.define([
    "sap/ui/core/mvc/Controller",
     "sap/m/MessageToast",
      "sap/ui/model/json/JSONModel",
      "sap/ui/core/Fragment",
       "sap/m/SuggestionItem"
], (Controller,MessageToast,JSONModel,Fragment,SuggestionItem) => {
    "use strict";

    return Controller.extend("com.docqanda.docqa.controller.View1", {
        onInit() {
            // this.getView().setModel(new JSONModel({ answer: "", highlights: [] }));
            // this.docID = null;

            // for progress indicator
            this.getView().setModel(new JSONModel({
              answer: "",
              highlights: [],
              // uploadProgress: 0,
              // uploadInProgress: false
            }));
            this.docID = null;

           
            this.loadQuestionSuggestions();
            const oSuggestionModel = new sap.ui.model.json.JSONModel({ questionSuggestions: [] });
            this.getView().setModel(oSuggestionModel, "suggestions");

            const oFilteredModel = new JSONModel({ results: [
              
            ] });
            this.getView().setModel(oFilteredModel, "filteredSuggestions");
            this.oSF = this.getView().byId("questionInput");
        },
        
        onFileChange: function (oEvent) {
          const file = oEvent.getParameter("files")[0];
          if (!file) return;
    

          const oVBox = this.byId("uploadContainer");
         
          
        
          // Create a new ProgressIndicator
          const progressIndicator = new sap.m.ProgressIndicator({
            percentValue: 0,
            displayValue: "0%",
            showValue: true,
            state: "Success",
            class: "sapUiSmallMarginTop"
          });
          oVBox.addItem(progressIndicator);
          // this._fileToBase64(file).then(function (base64) {
          //   const filename = file.name;
    
          //   // Upload Document using jQuery.ajax
          //   $.ajax({
          //     url: "./docqaDest/odata/v4/doc-qa/UploadDocument",
          //     method: "POST",
          //     contentType: "application/json",
          //     data: JSON.stringify({ filename, content: base64 }),
          //     success: function (uploadedDocID) {
          //       //this.docID = uploadedDocID;
          //       this.docID = uploadedDocID.value;
          //       MessageToast.show("PDF uploaded. Generating embeddings...");
    
          //       // Generate Embeddings
          //       $.ajax({
          //         url: "./docqaDest/odata/v4/doc-qa/GenerateEmbeddings",
          //         method: "POST",
          //         contentType: "application/json",
          //         data: JSON.stringify({ docID: this.docID }),
          //         success: function () {
          //           MessageToast.show("Embeddings generated. You can now ask a question.");
          //         }.bind(this),
          //         error: function (xhr) {
          //           console.error(xhr.responseText);
          //           MessageToast.show("Embedding failed: " + xhr.responseText);
          //         }
          //       });
    
          //     }.bind(this),
          //     error: function (xhr) {
          //       console.error(xhr.responseText);
          //       MessageToast.show("Upload failed: " + xhr.responseText);
          //     }
          //   });
    
          // }.bind(this)).catch(function (err) {
          //   console.error(err);
          //   MessageToast.show("Error reading file");
          // });

          // newly added
          this._fileToBase64(file).then(function (base64) {
            const oModel = this.getView().getModel();
            //oModel.setProperty("/uploadInProgress", true);
            // oModel.setProperty("/uploadProgress", 0);
    
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "./docqaDest/odata/v4/doc-qa/UploadDocument", true);
            xhr.setRequestHeader("Content-Type", "application/json");
    
            // Progress handler
            xhr.upload.onprogress = function (event) {
              if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                //oModel.setProperty("/uploadProgress", percent);
                progressIndicator.setPercentValue(percent);
                progressIndicator.setDisplayValue(percent + "%");
              }
            };
    
            // Upload finished
            xhr.onload = function () {
              //oModel.setProperty("/uploadInProgress", false);
              oVBox.removeItem(progressIndicator);
              progressIndicator.destroy();
    
              if (xhr.status >= 200 && xhr.status < 300) {
                const uploadedDocID = JSON.parse(xhr.responseText).value;
                this.docID = uploadedDocID;
                MessageToast.show("File uploaded. Generating embeddings...");
    
                // Generate Embeddings
                $.ajax({
                  url: "./docqaDest/odata/v4/doc-qa/GenerateEmbeddings",
                  method: "POST",
                  contentType: "application/json",
                  data: JSON.stringify({ docID: this.docID }),
                  success: function () {
                    MessageToast.show("Embeddings generated. You can now ask a question.");
                    oModel.setProperty("/uploadInProgress", false);
                  },
                  error: function (xhr) {
                    console.error(xhr.responseText);
                    MessageToast.show("Embedding failed: " + xhr.responseText);
                  }
                });
    
              } else {
                console.error(xhr.responseText);
                MessageToast.show("Upload failed");
                
              }
            }.bind(this);
    
            // Upload error
            xhr.onerror = function () {
              //oModel.setProperty("/uploadInProgress", false);
              //progressIndicator.destroy();
              MessageToast.show("Upload failed due to network error");
            };
    
            // Send upload request
            xhr.send(JSON.stringify({ filename: file.name, content: base64 }));
    
          }.bind(this)).catch(function (err) {
            console.error(err);
            MessageToast.show("Error reading file");
          });
          this.getView().byId("questionInput").setEnabled(true);

      
        },
    
        onAskQuestion: function (oEvent) {
          //const question = this.byId("questionInput").getValue().trim();
          //progressIndicator.destroy();
           const oModel = this.getView().getModel();
          // oModel.setProperty("/uploadInProgress", false);
          // oModel.setProperty("/uploadProgress", 0);
         // const question = this.byId("questionInput").getValue();
         const question = oEvent?.getParameter("query") || this.byId("questionInput").getValue().trim();
          if (!question || !this.docID) {
            MessageToast.show("Please enter a question.");
            return;
          }
    
          // Ask Question
          $.ajax({
            url: "./docqaDest/odata/v4/doc-qa/AskQuestion",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ question, docID: this.docID }),
            success: function (result) {
              //progressIndicator.destroy();
              //this.getView().getModel().setData(result);
               //  Keep only the first highlight
      const filtered = {
        answer: result.answer,
        highlights: result.highlights?.length ? [result.highlights[0]] : []
      };
      this.getView().getModel().setData(filtered);
            }.bind(this),
            error: function (xhr) {
             // progressIndicator.destroy();
              console.error(xhr.responseText);
              MessageToast.show("Failed to get answer: " + xhr.responseText);
            }
          });
        },
    
        _fileToBase64: function (file) {
          return new Promise(function (resolve, reject) {
            const reader = new FileReader();
            reader.onload = function () {
              const base64 = reader.result.split(",")[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        },
        // onScrapeWebPage: function () {
        //   const url = this.byId("urlInput").getValue();
        //   const oModel = this.getView().getModel();
        
        //   if (!url) {
        //     MessageToast.show("Please enter a valid URL.");
        //     return;
        //   }
        
        //   // Call ScrapeWebPage endpoint
        //   $.ajax({
        //     url: "./docqaDest/odata/v4/doc-qa/ScrapeWebPage",
        //     method: "POST",
        //     contentType: "application/json",
        //     data: JSON.stringify({ url }),
        //     success: function (uploadedDocID) {
        //       this.docID = uploadedDocID.value;
        //       MessageToast.show("Web page scraped. Generating embeddings...");
        
        //       // Generate embeddings
        //       $.ajax({
        //         url: "./docqaDest/odata/v4/doc-qa/GenerateEmbeddings",
        //         method: "POST",
        //         contentType: "application/json",
        //         data: JSON.stringify({ docID: this.docID }),
        //         success: function () {
        //           MessageToast.show("Embeddings generated. You can now ask a question.");
        //         }.bind(this),
        //         error: function (xhr) {
        //           console.error(xhr.responseText);
        //           MessageToast.show("Embedding failed: " + xhr.responseText);
        //         }
        //       });
        
        //     }.bind(this),
        //     error: function (xhr) {
        //       console.error(xhr.responseText);
        //       MessageToast.show("Failed to scrape page: " + xhr.responseText);
        //     }
        //   });
        //   this.byId("questionInput").setEnabled(true);
        // },
        onScrapeWebPage: function () {
          const url = this.byId("urlInput").getValue();
          const oModel = this.getView().getModel();
          const oVBox = this.byId("uploadContainer");
        
          if (!url) {
            MessageToast.show("Please enter a valid URL.");
            return;
          }
        
          // Create and add progress indicator
          const progressIndicator = new sap.m.ProgressIndicator({
            percentValue: 50, // Static estimate during scraping
            displayValue: "Scraping...",
            showValue: true,
            state: "Information",
            class: "sapUiSmallMarginTop"
          });
          oVBox.addItem(progressIndicator);
        
          // Call ScrapeWebPage endpoint
          $.ajax({
            url: "./docqaDest/odata/v4/doc-qa/ScrapeWebPage",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ url }),
            success: function (uploadedDocID) {
              this.docID = uploadedDocID.value;
              progressIndicator.setDisplayValue("Generating embeddings...");
              progressIndicator.setPercentValue(80);
        
              // Generate embeddings
              $.ajax({
                url: "./docqaDest/odata/v4/doc-qa/GenerateEmbeddings",
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify({ docID: this.docID }),
                success: function () {
                  MessageToast.show("Embeddings generated. You can now ask a question.");
                  oVBox.removeItem(progressIndicator);
                  progressIndicator.destroy();
                }.bind(this),
                error: function (xhr) {
                  console.error(xhr.responseText);
                  MessageToast.show("Embedding failed: " + xhr.responseText);
                  oVBox.removeItem(progressIndicator);
                  progressIndicator.destroy();
                }
              });
        
            }.bind(this),
            error: function (xhr) {
              console.error(xhr.responseText);
              MessageToast.show("Failed to scrape page: " + xhr.responseText);
              oVBox.removeItem(progressIndicator);
              progressIndicator.destroy();
            }
          });
        
          this.byId("questionInput").setEnabled(true);
        },
        // for Histroy
        // onHistoryPress: async function () {
        //   const oDialog = await this.loadFragment({
        //     name: "com.docqanda.docqa.view.HistoryDialog",
        //     controller: this
        //   });
          
        //   //AJAX call to fetch data
        //   $.ajax({
        //     url: "./docqaDest/odata/v4/doc-qa/AskedQuestions", // adjust if your base path is different
        //     method: "GET",
        //     dataType: "json",
        //     success: function (data) {
        //       const oHistoryModel = new sap.ui.model.json.JSONModel({ questions: data.value });
        //       oDialog.setModel(oHistoryModel, "history");
        //       oDialog.open();
        //     },
        //     error: function () {
        //       sap.m.MessageToast.show("Failed to load history.");
        //     }
        //   });
        // },
        onHistoryPress: function () {
          const oView = this.getView();
        
          // Destroy existing dialog if already exists (to avoid duplicate ID error)
          const oldDialog = sap.ui.core.Fragment.byId(oView.createId("historyDialog"));
          if (oldDialog) {
            oldDialog.destroy();
          }
        
          // Load the fragment fresh each time (your requirement)
          sap.ui.core.Fragment.load({
            name: "com.docqanda.docqa.view.HistoryDialog",
            controller: this,
            id: oView.getId() // ensures unique ID prefix
          }).then(function (oDialog) {
            oView.addDependent(oDialog);
            //oDialog.open();
            // Perform AJAX call to load history
            //const oModel = oView.getModel(); // OData model
             //   //AJAX call to fetch data
          // $.ajax({
          //   url: "./docqaDest/odata/v4/doc-qa/AskedQuestions", // adjust if your base path is different
          //   method: "GET",
          //   dataType: "json",
          //   success: function (data) {
          //     const oHistoryModel = new sap.ui.model.json.JSONModel({ questions: data.value });
          //     oDialog.setModel(oHistoryModel, "history");
          //     oDialog.open();
          //   },
          //   error: function () {
          //     sap.m.MessageToast.show("Failed to load history.");
          //   }
          // });
          $.ajax({
            url: "./docqaDest/odata/v4/doc-qa/AskedQuestions?$orderby=CreatedAt desc", // optional: latest first
            method: "GET",
            dataType: "json",
            success: function (data) {
              const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const filtered = data.value.filter(entry => {
    const createdAt = new Date(entry.CreatedAt);
    return createdAt >= startOfToday && createdAt < endOfToday;
  });

  const oHistoryModel = new sap.ui.model.json.JSONModel({ questions: filtered,_allQuestions: data.value  });
  oDialog.setModel(oHistoryModel, "history");
  oDialog.open();
            },
            error: function () {
              sap.m.MessageToast.show("Failed to load history.");
            }
          });
          });
        },
        // onCloseHistoryDialog: function () {
        //   //const oDialog = sap.ui.core.Fragment.byId("com.docqanda.docqa.view.HistoryDialog", "historyDialog");
        //   this.byId("historyDialog").close();
        // }
        onCloseHistoryDialog: function (oEvent) {
          const oDialog = oEvent.getSource().getParent();
          oDialog.close();
          oDialog.destroy(); // destroy to prevent duplicate ID issues next time
        },

        // search suggestion
        loadQuestionSuggestions: function () {
          $.ajax({
            url: "./docqaDest/odata/v4/doc-qa/AskedQuestions",
            method: "GET",
            dataType: "json",
            success: function (data) {
              const rawQuestions = data.value.map(q => q.Question);
        
              // Create a map to remove duplicates case-insensitively
              const questionMap = new Map();
              rawQuestions.forEach((q) => {
                const normalized = q.trim().toLowerCase();
                if (!questionMap.has(normalized)) {
                  questionMap.set(normalized, q); // Preserve original casing
                }
              });
        
              // Convert back to array of objects
              const formatted = Array.from(questionMap.values()).map(q => ({ question: q }));
        
              // Set to "suggestions" model
              const oSuggestionModel = this.getView().getModel("suggestions");
              oSuggestionModel.setProperty("/questionSuggestions", formatted);
        
              console.log("Loaded suggestions:", formatted);
            }.bind(this),
            error: function () {
              sap.m.MessageToast.show("Failed to load suggestions.");
            }
          });
        },
     
        onSuggest: function (oEvent) {
          const sValue = oEvent.getParameter("suggestValue");
          const oSuggestionModel = this.getView().getModel("suggestions");
          const oFilteredModel = this.getView().getModel("filteredSuggestions");
        
          if (!oSuggestionModel || !oFilteredModel) return;
        
          const aData = oSuggestionModel.getProperty("/questionSuggestions") || [];
        
          const aFiltered = sValue
            ? aData.filter(q => q.question.toLowerCase().includes(sValue.toLowerCase()))
            : [];
        
          // oFilteredModel.setProperty("/results", aData);
          oFilteredModel.setProperty("/results", aFiltered);
          this.oSF.getBinding("suggestionItems").filter([]);
			    this.oSF.suggest();
        },

        // new added
      //   onVoiceAsk: function () {
      //     if (!navigator.mediaDevices || !window.MediaRecorder) {
      //         MessageToast.show("Your browser doesn't support voice input.");
      //         return;
      //     }
      
      //     MessageToast.show("🎙️ Listening... Speak your question.");
      //     const constraints = { audio: true };
      
      //     navigator.mediaDevices.getUserMedia(constraints).then(stream => {
      //         const mediaRecorder = new MediaRecorder(stream);
      //         const audioChunks = [];
      
      //         mediaRecorder.ondataavailable = event => {
      //             if (event.data.size > 0) {
      //                 audioChunks.push(event.data);
      //             }
      //         };
      
      //         mediaRecorder.onstop = () => {
      //             const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      
      //             const reader = new FileReader();
      //             reader.onloadend = () => {
      //                 const base64Audio = reader.result.split(',')[1];
      
      //                 // 🔁 Send to backend
      //                 $.ajax({
      //                     url: "./docqaDest/odata/v4/doc-qa/TranscribeVoice",
      //                     method: "POST",
      //                     contentType: "application/json",
      //                     data: JSON.stringify({ audio: base64Audio }),
      //                     success: function (result) {
      //                         if (result.transcript) {
      //                             this.byId("questionInput").setValue(result.transcript);
      //                             this.onAskQuestion(); // call same as text
      //                         } else {
      //                             MessageToast.show("No transcription returned.");
      //                         }
      //                     }.bind(this),
      //                     error: function (xhr) {
      //                         console.error(xhr.responseText);
      //                         MessageToast.show("Voice transcription failed.");
      //                     }
      //                 });
      //             };
      //             reader.readAsDataURL(audioBlob);
      //         };
      
      //         mediaRecorder.start();
      
      //         setTimeout(() => {
      //             mediaRecorder.stop();
      //         }, 4000); // record for 4 seconds
      //     }).catch(err => {
      //         console.error(err);
      //         MessageToast.show("Could not access microphone.");
      //     });
      // }
      onVoiceAsk: function () {
        if (!navigator.mediaDevices || !window.MediaRecorder) {
            MessageToast.show("Your browser doesn't support voice input.");
            return;
        }
    
        MessageToast.show("🎙️ Listening... Speak your question.");
        const constraints = { audio: true };
    
        navigator.mediaDevices.getUserMedia(constraints).then(stream => {
            const mediaRecorder = new MediaRecorder(stream);
            const audioChunks = [];
    
            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };
    
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
    
                // Convert Blob to base64
                const base64Audio = await this.convertBlobToBase64(audioBlob);
    
                const payload = {
                    filename: "voice.webm",
                    filetype: "audio/webm",
                    filedata: base64Audio.split(',')[1] // remove data URL prefix
                };
    
                fetch("./docqaDest/odata/v4/doc-qa/TranscribeVoice", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error("Transcription request failed.");
                        }
                        return response.json();
                    })
                    .then(result => {
                        if (result.value) {
                            this.byId("questionInput").setValue(result.value);
                            this.onAskQuestion();
                        } else {
                            MessageToast.show("No transcription returned.");
                        }
                    })
                    .catch(error => {
                        console.error("Error:", error);
                        MessageToast.show("Voice transcription failed.");
                    });
            };
    
            mediaRecorder.start();
            setTimeout(() => mediaRecorder.stop(), 4000); // Record for 4 seconds
        }).catch(err => {
            console.error(err);
            MessageToast.show("Could not access microphone.");
        });
    },
    
    convertBlobToBase64: function (blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    },
    onThemeChange: function (oEvent) {
      const sSelectedTheme = oEvent.getParameter("selectedItem").getKey();
      sap.ui.getCore().applyTheme(sSelectedTheme);
      localStorage.setItem("selectedTheme", sSelectedTheme); // optional: remember the theme
  },
  onFilterWeekly: function () {
    this._filterHistoryByDays(7);
  },
  
  onFilterMonthly: function () {
    this._filterHistoryByDays(30);
  },
  
  _filterHistoryByDays: function (days) {
    const oDialog = this.byId("historyDialog");
    const oModel = oDialog.getModel("history");
    if (!oModel) return;
  
    const all = oModel.getProperty("/_allQuestions") || [];
    const now = new Date();
    const from = new Date();
    from.setDate(now.getDate() - days);
  
    const filtered = all.filter(entry => {
      const createdAt = new Date(entry.CreatedAt);
      return createdAt >= from && createdAt <= now;
    });
  
    oModel.setProperty("/questions", filtered);
  },
  
  // adding chart===============================================================================
  onChartPress: function () {
    const oView = this.getView();
  
    // Destroy previous to avoid ID conflicts
    const oldChartDialog = sap.ui.core.Fragment.byId(oView.createId("chartDialog"));
    if (oldChartDialog) oldChartDialog.destroy();
  
    sap.ui.core.Fragment.load({
      name: "com.docqanda.docqa.view.ChartDialog",
      controller: this,
      id: oView.getId()
    }).then(function (oDialog) {
      oView.addDependent(oDialog);
  
      const chartModel = new sap.ui.model.json.JSONModel({ data: [] });
      oDialog.setModel(chartModel, "chart");
  
      oDialog.open();
      this._loadChartData("today"); // default view
    }.bind(this));
  },
  
  _loadChartData: function (range) {
    $.ajax({
      url: "./docqaDest/odata/v4/doc-qa/AskedQuestions?$orderby=CreatedAt desc",
      method: "GET",
      success: function (data) {
        const now = new Date();
        let fromDate;
  
        switch (range) {
          case "weekly":
            fromDate = new Date(now);
            fromDate.setDate(now.getDate() - 6);
            break;
          case "monthly":
            fromDate = new Date(now);
            fromDate.setDate(now.getDate() - 29);
            break;
          default: // today
            fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }
  
        const countsByDay = {};
  
        data.value.forEach(item => {
          const created = new Date(item.CreatedAt);
          if (created >= fromDate && created <= now) {
            const label = created.toISOString().split('T')[0];
            countsByDay[label] = (countsByDay[label] || 0) + 1;
          }
        });
  
        const chartData = Object.entries(countsByDay).map(([label, value]) => ({ label, value }));
  
        const oDialog = this.byId("chartDialog");
        const oChartModel = oDialog.getModel("chart");
        oChartModel.setProperty("/data", chartData);
      }.bind(this),
      error: function () {
        sap.m.MessageToast.show("Error loading chart data.");
      }
    });
  },
 
  onFilterTodayChart: function () {
    this._loadChartData("today");
  },
  onFilterWeeklyChart: function () {
    this._loadChartData("weekly");
  },
  onFilterMonthlyChart: function () {
    this._loadChartData("monthly");
  },
  onCloseChartDialog: function (oEvent) {
    const oDialog = oEvent.getSource().getParent();
    oDialog.close();
    oDialog.destroy();
  },
  _getRuntimeBaseURL: function () {
    var appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");
    var appPath = appId.replaceAll(".", "/");
    var appModulePath = jQuery.sap.getModulePath(appPath);

    return appModulePath;
},
  
    
    
    
        
    });
});