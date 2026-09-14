document.addEventListener("DOMContentLoaded", () => {
  const firebaseConfig = {
    apiKey: "AIzaSyB_70ZAPklAhCmp50L_J4PtjNW0zvYUAfE",
    authDomain: "wifi-captive-portal-77.firebaseapp.com",
    projectId: "wifi-captive-portal-77",
    storageBucket: "wifi-captive-portal-77.appspot.com",
    messagingSenderId: "190415808729",
    appId: "1:190415808729:web:2c8ab51f245a08c044b6c8"
  };

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const auth = firebase.auth();
  const db = firebase.firestore();

  const loginSection = document.getElementById("loginSection");
  const adminSection = document.getElementById("adminSection");
  const loginButton = document.getElementById("loginButton");
  const logoutButton = document.getElementById("logoutButton");
  const adminEmailInput = document.getElementById("adminEmail");
  const adminPasswordInput = document.getElementById("adminPassword");
  const loginStatus = document.getElementById("loginStatus");
  const actionStatus = document.getElementById("actionStatus");

  auth.onAuthStateChanged((user) => {
    if (user) {
      loginSection.classList.add("hidden");
      adminSection.classList.remove("hidden");
    } else {
      adminSection.classList.add("hidden");
      loginSection.classList.remove("hidden");
      adminPasswordInput.value = "";
      actionStatus.style.display = "none";
    }
  });

  loginButton.addEventListener("click", async () => {
    loginStatus.textContent = "";
    const email = adminEmailInput.value.trim();
    const password = adminPasswordInput.value;

    if (!email || !password) {
      loginStatus.textContent = "Por favor completa todos los campos.";
      return;
    }

    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
      console.error("Error de autenticación:", error);
      loginStatus.textContent = "Credenciales incorrectas o acceso no autorizado.";
    }
  });

  logoutButton.addEventListener("click", async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  });

  function showStatus(message, type) {
    actionStatus.textContent = message;
    actionStatus.className = `alert mt-4 mb-0 small alert-${type}`;
    actionStatus.style.display = "block";
    setTimeout(() => {
      actionStatus.style.display = "none";
    }, 4000);
  }

  document.querySelectorAll(".btn-group-custom button").forEach((button) => {
    button.addEventListener("click", async (e) => {
      const action = e.target.getAttribute("data-action");

      try {
        const snapshot = await db.collection("wifi_submissions").get();

        if (snapshot.empty) {
          showStatus("No hay registros disponibles en este momento.", "warning");
          return;
        }

        if (action === "export") {
          let htmlTable = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head><meta http-equiv="content-type" content="text/html; charset=UTF-8"></head>
            <body>
              <table border="1">
                <tr style="background-color: #2563eb; color: #ffffff; font-weight: bold;">
                  <th>Nombre</th>
                  <th>Correo Electronico</th>
                  <th>Telefono</th>
                  <th>ID Local</th>
                  <th>Fecha y Hora</th>
                </tr>
          `;

          snapshot.forEach((doc) => {
            const data = doc.data();
            htmlTable += `
              <tr>
                <td>${data.name || ""}</td>
                <td>${data.email || ""}</td>
                <td>${data.phone || "N/A"}</td>
                <td>${data.localID || "sba-001"}</td>
                <td>${data.timeString || ""}</td>
              </tr>
            `;
          });

          htmlTable += `</table></body></html>`;

          const blob = new Blob([htmlTable], { type: "application/vnd.ms-excel" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          
          link.setAttribute("href", url);
          link.setAttribute("download", `reporte_wifi.xls`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          showStatus("Reporte exportado correctamente.", "success");

        } else if (action === "archive") {
          const batch = db.batch();
          snapshot.forEach((doc) => {
            const data = doc.data();
            const archiveRef = db.collection("wifi_archive").doc(doc.id);
            batch.set(archiveRef, data);
            batch.delete(doc.ref);
          });
          await batch.commit();
          showStatus("Registros archivados con éxito en la base de datos.", "success");

        } else if (action === "delete") {
          if (confirm("¿Estás seguro de borrar todos los registros actuales? Esta acción no se puede deshacer.")) {
            const batch = db.batch();
            snapshot.forEach((doc) => {
              batch.delete(doc.ref);
            });
            await batch.commit();
            showStatus("Registros eliminados correctamente.", "danger");
          }
        }

      } catch (error) {
        console.error("Error en la operación:", error);
        showStatus("Ocurrió un error al procesar la solicitud.", "danger");
      }
    });
  });
});