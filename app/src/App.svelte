<script lang="ts">
  const GOV_SIGN_URL = "https://sso.acesso.gov.br/login?client_id=assinador.iti.br&authorization_id=19dcf7f5811";

  type FormState = {
    nome: string;
    cpf: string;
    endereco: string;
    bairro: string;
    municipio: string;
    cep: string;
  };

  let form = $state<FormState>({
    nome: "",
    cpf: "",
    endereco: "",
    bairro: "",
    municipio: "",
    cep: "",
  });

  let isLoading = $state(false);
  let errorMessage = $state("");
  let downloaded = $state(false);

  const fields: Array<{ key: keyof FormState; label: string; placeholder: string }> = [
    { key: "nome", label: "Outorgante", placeholder: "Nome completo" },
    { key: "cpf", label: "CPF", placeholder: "000.000.000-00" },
    { key: "endereco", label: "Rua / Endereço", placeholder: "Rua, número e complemento" },
    { key: "bairro", label: "Bairro", placeholder: "Bairro" },
    { key: "municipio", label: "Município", placeholder: "Município" },
    { key: "cep", label: "CEP", placeholder: "00000-000" },
  ];

  const downloadPdf = async () => {
    isLoading = true;
    errorMessage = "";
    downloaded = false;

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("Não foi possível gerar o PDF. Verifique os dados informados.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "procuracao-preenchida.pdf";
      link.click();
      URL.revokeObjectURL(url);
      downloaded = true;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Erro inesperado ao gerar o PDF.";
    } finally {
      isLoading = false;
    }
  };
</script>

<main class="page-shell">
  <section class="hero-card">
    <div class="eyebrow">Editor de PDF</div>
    <h1>Preencha a procuração em poucos segundos</h1>
    <p>Informe os dados do outorgante, baixe o PDF preenchido e depois assine pelo gov.br.</p>
  </section>

  <section class="form-card" aria-label="Formulário da procuração">
    <form onsubmit={(event) => { event.preventDefault(); downloadPdf(); }}>
      <div class="grid">
        {#each fields as field}
          <label class="field">
            <span>{field.label}</span>
            <input
              bind:value={form[field.key]}
              maxlength="120"
              placeholder={field.placeholder}
              required
            />
          </label>
        {/each}
      </div>

      {#if errorMessage}
        <p class="error" role="alert">{errorMessage}</p>
      {/if}

      <div class="actions">
        <button class="primary-button" type="submit" disabled={isLoading}>
          {isLoading ? "Gerando PDF..." : "Baixar PDF"}
        </button>

        {#if downloaded}
          <a class="gov-button" href={GOV_SIGN_URL} target="_blank" rel="noreferrer">
            <span>Assinar pelo</span>
            <img src="/govbr.png" alt="gov.br" />
          </a>
        {/if}
      </div>
    </form>
  </section>
</main>
