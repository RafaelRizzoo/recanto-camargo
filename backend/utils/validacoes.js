// Validações reutilizáveis de dados de cadastro (executadas no servidor, independentemente do front).

// Formato básico de e-mail: texto@dominio.extensao, sem espaços.
function emailValido(email) {
    const texto = String(email || '').trim();
    return texto.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(texto);
}

// CPF com 11 dígitos e dígitos verificadores corretos (rejeita sequências repetidas, como 111.111.111-11).
function cpfValido(cpf) {
    const numeros = String(cpf || '').replace(/\D/g, '');
    if (numeros.length !== 11 || /^(\d)\1{10}$/.test(numeros)) return false;

    const calcularDigito = (base) => {
        const soma = base.split('').reduce((acc, d, i) => acc + Number(d) * (base.length + 1 - i), 0);
        const resto = (soma * 10) % 11;
        return resto === 10 ? 0 : resto;
    };

    const d1 = calcularDigito(numeros.slice(0, 9));
    const d2 = calcularDigito(numeros.slice(0, 9) + d1);
    return d1 === Number(numeros[9]) && d2 === Number(numeros[10]);
}

module.exports = { emailValido, cpfValido };
