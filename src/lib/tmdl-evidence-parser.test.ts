import {describe,expect,it} from "vitest";
import {parseTmdlEvidence} from "./tmdl-evidence-parser";

const hash="a".repeat(64);

describe("TMDL semantic evidence parser",()=>{
  it("aggregates partial tables and preserves descriptions and multiline DAX",()=>{
    const parsed=parseTmdlEvidence({displayName:"Operations",archiveFingerprint:hash,documents:[
      {path:"definition/tables/Sales.tmdl",text:[
        "/// Recorded operating events",
        "table Sales",
        "\t/// Stable event identifier",
        "\tcolumn SaleKey",
        "\t\tdataType: int64",
        "\t\tisKey",
        "\tcolumn Amount",
        "\t\tdataType: decimal",
        "\tpartition Sales = m",
        "\t\tmode: import",
        "\t\tsource =",
        "\t\t\tSql.Database(\"private-server\", \"operations\")",
      ].join("\n")},
      {path:"definition/measures.tmdl",text:[
        "table Sales",
        "\t/// Approved revenue definition",
        "\tmeasure Revenue =",
        "\t\tSUMX(",
        "\t\t\tSales,",
        "\t\t\t\tSales[Amount]",
        "\t\t)",
        "\t\tformatString: $#,##0",
      ].join("\n")},
      {path:"definition/relationships.tmdl",text:""},
    ]});
    expect(parsed.tables).toHaveLength(1);
    expect(parsed.tables[0]).toMatchObject({name:"Sales",description:"Recorded operating events",columns:[{name:"Amount"},{name:"SaleKey",isKey:true}],partitions:[{mode:"import"}]});
    expect(parsed.tables[0].measures[0]).toMatchObject({name:"Revenue",description:"Approved revenue definition",formatString:"$#,##0"});
    expect(parsed.tables[0].measures[0].expression).toContain("SUMX(\n\tSales,\n\t\tSales[Amount]\n)");
    expect(parsed.sourceSummary).toBe("Import");
    expect(JSON.stringify(parsed)).not.toContain("private-server");
  });

  it("extracts relationships and role summaries while diagnosing unsupported evidence",()=>{
    const parsed=parseTmdlEvidence({displayName:"Model",archiveFingerprint:hash,documents:[
      {path:"definition/tables/Fact.tmdl",text:"table Fact\n\tcolumn DimKey\n\t\tdataType: int64"},
      {path:"definition/tables/Dim.tmdl",text:"table Dim\n\tcolumn Key\n\t\tdataType: int64\n\thierarchy Browse"},
      {path:"definition/relationships.tmdl",text:[
        "relationship rel-1",
        "\tfromColumn: Fact.DimKey",
        "\ttoColumn: Dim.Key",
        "\tcrossFilteringBehavior: bothDirections",
      ].join("\n")},
      {path:"definition/roles/Readers.tmdl",text:"role Readers\n\ttablePermission Fact = [Region] = USERNAME()"},
      {path:"definition/perspectives/Executive.tmdl",text:"perspective Executive"},
    ]});
    expect(parsed.relationships[0]).toMatchObject({fromTable:"Fact",fromColumn:"DimKey",toTable:"Dim",toColumn:"Key",crossFilteringBehavior:"bothDirections"});
    expect(parsed.roles).toEqual([{name:"Readers",affectedTables:["Fact"]}]);
    expect(parsed.diagnostics.map(item=>item.code)).toEqual(expect.arrayContaining(["hierarchy-present","unsupported-document"]));
    expect(JSON.stringify(parsed)).not.toContain("USERNAME()");
  });

  it("fails closed through error diagnostics for duplicate partial declarations",()=>{
    const parsed=parseTmdlEvidence({displayName:"Model",archiveFingerprint:hash,documents:[
      {path:"definition/tables/A.tmdl",text:"table A\n\tcolumn Key"},
      {path:"definition/extra.tmdl",text:"table A\n\tcolumn Key"},
    ]});
    expect(parsed.diagnostics).toContainEqual(expect.objectContaining({code:"duplicate-column",severity:"error"}));
  });

  it("normalizes document order deterministically",()=>{
    const documents=[{path:"definition/tables/B.tmdl",text:"table B\n\tcolumn Key"},{path:"definition/tables/A.tmdl",text:"table A\n\tcolumn Key"}];
    const forward=parseTmdlEvidence({displayName:"Model",archiveFingerprint:hash,documents});
    const reverse=parseTmdlEvidence({displayName:"Model",archiveFingerprint:hash,documents:[...documents].reverse()});
    expect(reverse).toEqual(forward);expect(forward.tables.map(table=>table.name)).toEqual(["A","B"]);
  });
});
