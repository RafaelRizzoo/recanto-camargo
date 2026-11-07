import PropTypes from "prop-types";
import { Field, Label, Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import "./ListaSelecao.css";

// Lista de seleção acessível (teclado, leitor de tela) com o visual do site.
// Substitui o <select> nativo, que no Windows abre sempre com o visual do sistema.
function ListaSelecao({ rotulo, valor, opcoes, aoMudar, placeholder, className = "", invalido = false, id }) {
  const atual = opcoes.find((o) => String(o.valor) === String(valor));
  return (
    <Field className={`rc-lista ${className}`}>
      {rotulo && <Label className="rc-lista-rotulo">{rotulo}</Label>}
      <Listbox value={valor} onChange={aoMudar}>
        <ListboxButton id={id} className={`rc-lista-botao${invalido ? " rc-lista-invalida" : ""}`} aria-invalid={invalido || undefined}>
          <span className={atual ? "" : "rc-placeholder"}>{atual ? atual.texto : placeholder}</span>
          <i className="bi bi-chevron-down rc-lista-seta" aria-hidden="true" />
        </ListboxButton>
        <ListboxOptions anchor={{ to: "bottom start", gap: 8 }} className="rc-lista-opcoes" modal={false}>
          {opcoes.map((o) => (
            <ListboxOption key={o.valor} value={o.valor} className="rc-lista-opcao">
              {o.cor && <i className="rc-lista-dot" style={{ "--c": o.cor }} aria-hidden="true" />}
              <span className="rc-lista-texto">{o.texto}</span>
              <i className="bi bi-check2 rc-lista-check" aria-hidden="true" />
            </ListboxOption>
          ))}
        </ListboxOptions>
      </Listbox>
    </Field>
  );
}

ListaSelecao.propTypes = {
  rotulo: PropTypes.node,
  valor: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  opcoes: PropTypes.arrayOf(
    PropTypes.shape({
      valor: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      texto: PropTypes.node.isRequired,
      cor: PropTypes.string,
    })
  ).isRequired,
  aoMudar: PropTypes.func.isRequired,
  placeholder: PropTypes.node,
  className: PropTypes.string,
  invalido: PropTypes.bool,
  id: PropTypes.string,
};

export default ListaSelecao;
