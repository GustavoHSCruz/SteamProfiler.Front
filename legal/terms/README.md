# Histórico dos Termos de Uso

Cada `vN.json` contém a revisão integral em português e inglês, versão, data de
vigência e resumos. Depois do primeiro commit, esse arquivo é preservado. Uma
correção exige `vN+1.json`; nunca substitua ou exclua uma revisão publicada.

`node tools/gen-terms.js` gera `TERMS.md`, os arquivos públicos do histórico e os
metadados da página. O texto exibido deve coincidir com as traduções `tos.*`
construídas a partir de SteamProfiler.i18n. Idiomas sem tradução dos termos usam
inglês, seguindo o fallback existente.

O hash é o commit que adicionou o snapshot, encontrado pelo Git com histórico
completo. Até esse commit existir, a revisão aparece como rascunho. No deploy,
`--require-commits` impede a publicação sem o hash e verifica que nenhuma revisão
publicada foi alterada. O SHA é inserido apenas na cópia de publicação, evitando
a necessidade de um documento conter o hash do próprio commit.

As cláusulas foram redigidas considerando a implementação atual, preservando
os direitos legais aplicáveis. Referências para revisão do texto:

- [Marco Civil da Internet, especialmente arts. 7º e 8º](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm).
- [Código de Defesa do Consumidor, especialmente arts. 25 e 51](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm).
- [Lei Geral de Proteção de Dados Pessoais](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm).

Os termos não substituem as políticas específicas de privacidade nem as licenças
de código ou de materiais de terceiros. As limitações atuais da alpha do Duo
estão descritas; o texto não declara que tarefas operacionais pendentes já foram
implementadas.
