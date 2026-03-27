/**
 * Builds the KPCC membership card JSX object for Satori.
 * Satori requires inline styles only — no CSS classes.
 *
 * This variant:
 *  - No photo box
 *  - Fields shown with dotted lines (label: ............)
 *  - Full width fields
 *
 * @param {Object} data
 * @param {string} data.name
 * @param {string} data.membershipId
 * @param {string} data.epicNo
 * @param {string} data.phoneNumber
 * @param {string} data.acNo
 * @param {string} data.constituency
 * @param {string|null} data.signatureBase64
 * @param {string|null} data.bgBase64
 * @returns {Object} Satori-compatible React-element tree
 */

export function buildCardElement({
  name = "",
  membershipId = "",
  epicNo = "",
  phoneNumber = "",
  acNo = "",
  constituency = "",
  signatureBase64 = null,
  bgBase64 = null,
}) {
  const CARD_W = 600;
  const CARD_H = 375;
  const DOTS = " ....................................................";

  // ── reusable field row with dotted line ──────────────────────────────────
  const Field = (label, value) => ({
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "row",
        alignItems: "baseline",
        marginBottom: 10,
      },
      children: [
        {
          type: "span",
          props: {
            style: {
              fontWeight: 700,
              fontSize: 13,
              color: "#111",
              flexShrink: 0,
              marginRight: 4,
              marginLeft: 49,
            },
            children: label + ":",
          },
        },
        {
          type: "span",
          props: {
            style: {
              fontSize: 13,
              color: "#222",
              fontWeight: 500,
              flex: 1,
              overflow: "hidden",
              whiteSpace: "nowrap",
            },
            children: value ? " " + value : DOTS,
          },
        },
      ],
    },
  });

  // ── signature image ──────────────────────────────────────────────────────
  const SignatureImage = signatureBase64
    ? {
        type: "div",
        props: {
          style: {
            position: "absolute",
            bottom: 30,
            right: 60,      // shifted left from 24
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          },
          children: {
            type: "img",
            props: {
              src: signatureBase64,
              width: 120,   // increased from 90
              height: 45,   // increased from 34
              style: { objectFit: "contain" },
            },
          },
        },
      }
    : { type: "div", props: { style: {}, children: "" } };

  // ── root card ────────────────────────────────────────────────────────────
  return {
    type: "div",
    props: {
      style: {
        width: CARD_W,
        height: CARD_H,
        position: "relative",
        fontFamily: "sans-serif",
        display: "flex",
        flexDirection: "column",
      },
      children: [
        // ── 1. Background image ───────────────────────────────────────────
        {
          type: "img",
          props: {
            src: bgBase64,
            width: CARD_W,
            height: CARD_H,
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              width: CARD_W,
              height: CARD_H,
            },
          },
        },

        // ── 2. Fields overlay ─────────────────────────────────────────────
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              top: 130,
              left: 0,
              width: CARD_W,
              height: CARD_H - 130,
              display: "flex",
              flexDirection: "column",
              padding: "16px 30px 16px 14px",
            },
            children: [
              Field("Name", name),
              Field("Membership ID", membershipId),
              Field("EPIC No", epicNo),
              Field("Phone Number", phoneNumber),
              Field("AC No", acNo),
              Field("Constituency", constituency),
            ],
          },
        },

        // ── 3. Signature image ────────────────────────────────────────────
        SignatureImage,
      ],
    },
  };
}